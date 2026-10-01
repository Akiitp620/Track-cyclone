import json
import subprocess
import os

import asyncio

def initialize_earth_engine():
    # We no longer initialize in the main process to avoid uvicorn asyncio deadlocks.
    return True

async def check_status():
    """
    Checks real Earth Engine API connectivity by executing a tiny script via subprocess.
    """
    try:
        script = "import ee; ee.Initialize(project='sanqum'); print(ee.Number(1).getInfo())"
        proc = await asyncio.create_subprocess_exec(
            'python', '-c', script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        return proc.returncode == 0 and stdout.decode('utf-8').strip() == "1"
    except Exception:
        return False

async def get_elevation_data(assets):
    """
    Queries USGS/SRTMGL1_003 for elevation data at given asset locations.
    Uses an async subprocess to avoid httplib2/asyncio thread deadlocks in uvicorn.
    """
    try:
        worker_path = os.path.join(os.path.dirname(__file__), 'ee_worker.py')
        proc = await asyncio.create_subprocess_exec(
            'python', worker_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input=json.dumps(assets).encode('utf-8')),
            timeout=45.0
        )

        if proc.returncode == 0:
            return json.loads(stdout.decode('utf-8'))
        else:
            print(f"Earth Engine processing failed: {stderr.decode('utf-8')}")
            return None
    except asyncio.TimeoutError:
        print("Earth Engine subprocess timed out")
        if proc:
            proc.kill()
        return None
    except Exception as e:
        print(f"Earth Engine elevation processing error: {str(e)}")
        return None

async def get_geospatial_features(assets):
    """
    For the UI POST endpoint (backward compatibility).
    """
    # Just use the new elevation data and mock coastalExposure since it's just a demo calculation
    elevations = await get_elevation_data(assets)
    if not elevations:
        return None

    context = {}
    for el in elevations:
        asset_id = el['assetId']
        elevation = el.get('elevationMeters')
        elevation_available = el.get('elevationAvailable', True)

        # Simple coastal exposure heuristic based on elevation for the demo script
        if elevation is not None:
            exposure = min(1.0, max(0.1, (10 - elevation) / 10 if elevation < 10 else 0.1))
            context[asset_id] = {
                'elevation': round(elevation, 1),
                'elevationAvailable': True,
                'coastalExposure': round(exposure, 2)
            }
        else:
            context[asset_id] = {
                'elevation': None,
                'elevationAvailable': False,
                'coastalExposure': 0.5  # default fallback
            }

    return context

async def get_satellite_evidence(assets):
    """
    Queries Sentinel-1 GRD imagery for the given assets via an async subprocess.
    """
    try:
        worker_path = os.path.join(os.path.dirname(__file__), 'ee_sentinel_worker.py')
        proc = await asyncio.create_subprocess_exec(
            'python', worker_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        request_data = json.dumps({"assets": assets}).encode('utf-8')
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input=request_data),
            timeout=60.0
        )

        if proc.returncode == 0:
            return json.loads(stdout.decode('utf-8'))
        else:
            print(f"Earth Engine Sentinel-1 processing failed: {stderr.decode('utf-8')}")
            return {
                "status": "unavailable",
                "reason": "Subprocess error",
                "source": "earth_engine",
                "dataset": "COPERNICUS/S1_GRD"
            }
    except asyncio.TimeoutError:
        print("Earth Engine Sentinel-1 subprocess timed out")
        if proc:
            proc.kill()
        return {
            "status": "unavailable",
            "reason": "Timeout",
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD"
        }
    except Exception as e:
        print(f"Earth Engine Sentinel-1 processing error: {str(e)}")
        return {
            "status": "unavailable",
            "reason": str(e),
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD"
        }
