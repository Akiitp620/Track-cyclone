import sys
import json
import ee
from datetime import datetime, timedelta

def main():
    try:
        ee.Initialize(project='sanqum')
        input_data = sys.stdin.read()
        if not input_data.strip():
            return

        request = json.loads(input_data)
        assets = request.get('assets', [])

        if not assets:
            print(json.dumps({
                "status": "unavailable",
                "reason": "No assets provided for ROI",
                "source": "earth_engine",
                "dataset": "COPERNICUS/S1_GRD"
            }))
            return

        # Determine ROI (bounding box of all assets)
        lons = []
        lats = []
        for asset in assets:
            lon = asset.get('lng') or asset.get('longitude') or asset.get('x')
            lat = asset.get('lat') or asset.get('latitude') or asset.get('y')
            if lon is not None and lat is not None:
                lons.append(float(lon))
                lats.append(float(lat))

        if not lons:
            print(json.dumps({
                "status": "unavailable",
                "reason": "Invalid asset coordinates",
                "source": "earth_engine",
                "dataset": "COPERNICUS/S1_GRD"
            }))
            return

        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)

        # Add a small buffer around the bounding box (0.1 degrees ~ 11km)
        roi = ee.Geometry.Rectangle([min_lon - 0.1, min_lat - 0.1, max_lon + 0.1, max_lat + 0.1])

        # We will define an analysis period of the last 60 days
        now = datetime.utcnow()
        start_date = (now - timedelta(days=60)).strftime('%Y-%m-%d')
        end_date = now.strftime('%Y-%m-%d')

        # Load Sentinel-1 GRD imagery
        s1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
            .filterBounds(roi) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
            .filter(ee.Filter.eq('instrumentMode', 'IW'))

        # Count available scenes
        scene_count = s1.size().getInfo()

        if scene_count == 0:
            print(json.dumps({
                "status": "unavailable",
                "reason": "No Sentinel-1 scenes available in the selected ROI for the past 60 days.",
                "source": "earth_engine",
                "dataset": "COPERNICUS/S1_GRD",
                "analysisPeriod": f"{start_date} to {end_date}",
                "scenesAvailable": 0
            }))
            return

        # Get dates of available scenes
        # To avoid large data transfer, limit to 50 scenes
        scene_list = s1.toList(50)
        dates = []
        for i in range(min(scene_count, 50)):
            img = ee.Image(scene_list.get(i))
            dates.append(img.date().format('YYYY-MM-dd').getInfo())

        # Select VV polarization for backscatter measurement
        s1_vv = s1.select('VV')

        # Calculate median backscatter over the ROI (in dB)
        median_image = s1_vv.median()
        stats = median_image.reduceRegion(
            reducer=ee.Reducer.median(),
            geometry=roi,
            scale=100, # 100m scale for efficiency
            maxPixels=1e9
        ).getInfo()

        median_backscatter = stats.get('VV')

        print(json.dumps({
            "status": "connected",
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD",
            "scenesAvailable": scene_count,
            "analysisPeriod": f"{start_date} to {end_date}",
            "dates": sorted(list(set(dates))),
            "metrics": {
                "medianBackscatterDb": median_backscatter,
                "polarization": "VV"
            },
            "comparisonAvailable": scene_count >= 2
        }))

    except Exception as e:
        print(json.dumps({
            "status": "unavailable",
            "reason": str(e),
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD"
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
