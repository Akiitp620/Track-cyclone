import sys
import json
import ee

def main():
    try:
        ee.Initialize(project='sanqum')
        input_data = sys.stdin.read()
        if not input_data.strip():
            return

        assets = json.loads(input_data)

        features = []
        for asset in assets:
            # Handle different coordinate naming conventions
            x = asset.get('lng') or asset.get('longitude') or asset.get('x') or 0.0
            y = asset.get('lat') or asset.get('latitude') or asset.get('y') or 0.0
            asset_id = asset.get('id') or asset.get('assetId') or 'unknown'

            feature = ee.Feature(ee.Geometry.Point([x, y]), {'assetId': asset_id})
            features.append(feature)

        fc = ee.FeatureCollection(features)
        dem = ee.Image('USGS/SRTMGL1_003').select('elevation')
        sampled = dem.sampleRegions(collection=fc, scale=30, geometries=False)
        results = sampled.getInfo()

        found_ids = set()
        elevations = []
        for feature in results['features']:
            asset_id = feature['properties'].get('assetId')
            elevations.append({
                'assetId': asset_id,
                'elevationMeters': feature['properties'].get('elevation'),
                'elevationAvailable': True
            })
            found_ids.add(asset_id)

        # Pad missing assets
        for asset in assets:
            asset_id = asset.get('id') or asset.get('assetId') or 'unknown'
            if asset_id not in found_ids:
                elevations.append({
                    'assetId': asset_id,
                    'elevationMeters': None,
                    'elevationAvailable': False
                })

        print(json.dumps(elevations))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
