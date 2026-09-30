import os
import json
from google.cloud import bigquery
from google.auth.exceptions import DefaultCredentialsError

_client = None
_dataset_id = None

def get_bigquery_client():
    """
    Lazy initialization of the BigQuery client.
    Returns the client and dataset ID if configured and authenticated,
    otherwise returns (None, None).
    """
    global _client, _dataset_id
    if _client is not None:
        return _client, _dataset_id
        
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    dataset = os.getenv("BIGQUERY_DATASET", "cycloneshield")
    
    if not project_id:
        return None, None
        
    try:
        # Relies on Application Default Credentials
        _client = bigquery.Client(project=project_id)
        _dataset_id = f"{project_id}.{dataset}"
        return _client, _dataset_id
    except DefaultCredentialsError:
        print("BigQuery initialization failed: Missing Google Cloud credentials.")
        return None, None
    except Exception as e:
        print(f"BigQuery initialization failed: {e}")
        return None, None

def check_status():
    """
    Verifies if BigQuery is connected and the dataset exists.
    Returns 'connected', 'demo', or 'unavailable'.
    """
    client, dataset_id = get_bigquery_client()
    if not client:
        return {"status": "unavailable"}
        
    try:
        # Actually test a BigQuery operation: try to get the dataset
        client.get_dataset(dataset_id)
        
        # Verify tables exist
        expected_tables = ["cyclone_events", "infrastructure_assets", "impact_training_features"]
        tables = [t.table_id for t in client.list_tables(dataset_id)]
        
        missing = [t for t in expected_tables if t not in tables]
        if missing:
            print(f"BigQuery missing tables: {missing}")
            return {"status": "unavailable"}
            
        return {"status": "connected", "dataset": dataset_id.split('.')[1]}
    except Exception as e:
        print(f"BigQuery status check failed: {e}")
        # If dataset doesn't exist or other network errors occur
        return {"status": "unavailable"}

def prepare_training_features(event_id: str, asset_id: str, scenario: dict, features: dict):
    """
    Constructs a feature record for the impact_training_features table.
    """
    return {
        "event_id": event_id,
        "asset_id": asset_id,
        "wind_speed": float(features.get("windSpeed", 0)),
        "rainfall_mm": float(features.get("rainfall", 0)),
        "storm_category": int(features.get("category", 0)),
        "radius_km": float(features.get("radius", 0)),
        "track_distance_km": 0.0, # Not in standard features dict but part of schema
        "asset_vulnerability": float(features.get("vulnerability", 0)),
        "asset_criticality": 0, # Would come from asset db
        "population_served": 0, # Would come from asset db
        "access_routes": 0, # Would come from asset db
        "elevation_m": float(features.get("elevation", 0)),
        "coastal_exposure": float(features.get("coastalExposure", 0)),
        "impact_probability": None, # TARGET LABEL (requires verified historical data)
        "impact_severity": None # TARGET LABEL (requires verified historical data)
    }

def insert_training_features(features_list: list):
    """
    Inserts feature records into the training table.
    If BigQuery is unavailable, fails gracefully.
    """
    client, dataset_id = get_bigquery_client()
    if not client:
        return False
        
    table_id = f"{dataset_id}.impact_training_features"
    try:
        errors = client.insert_rows_json(table_id, features_list)
        if errors:
            print(f"Errors inserting into BigQuery: {errors}")
            return False
        return True
    except Exception as e:
        print(f"BigQuery insert failed: {e}")
        return False

def query_training_features(limit: int = 100):
    """
    Queries historical training features.
    If BigQuery is unavailable, returns empty list.
    """
    client, dataset_id = get_bigquery_client()
    if not client:
        return []
        
    query = f"SELECT * FROM `{dataset_id}.impact_training_features` LIMIT {limit}"
    try:
        query_job = client.query(query)
        return [dict(row) for row in query_job]
    except Exception as e:
        print(f"BigQuery query failed: {e}")
        return []
