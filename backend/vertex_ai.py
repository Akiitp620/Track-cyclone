import os
import json
from google.cloud import aiplatform

def predict_impact(features: dict) -> dict:
    """
    Calls a deployed Vertex AI prediction endpoint.
    If credentials or configuration are unavailable, returns a graceful fallback status.
    """
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
    endpoint_id = os.getenv("VERTEX_AI_ENDPOINT_ID")

    if not project or not endpoint_id:
        return {
            "status": "unavailable",
            "probability": None,
            "severity": None,
            "confidence": None,
            "model": None
        }

    try:
        # Initialize Vertex AI SDK
        aiplatform.init(project=project, location=location)

        # In a real deployed application, you'd use the endpoint ID directly.
        endpoint = aiplatform.Endpoint(
            endpoint_name=f"projects/{project}/locations/{location}/endpoints/{endpoint_id}"
        )

        # Call the model endpoint with features.
        # This assumes the endpoint takes a JSON structure containing 'instances'.
        # This will fail locally if ADC isn't configured, catching the Exception and returning unavailable.
        response = endpoint.predict(instances=[features])
        
        # Parse output. Assuming model returns probabilities and a severity label.
        # Adjust parsing logic based on actual model behavior in the future.
        predictions = response.predictions
        
        if not predictions or len(predictions) == 0:
            raise ValueError("No prediction returned from Vertex AI")
            
        pred = predictions[0]
        
        return {
            "status": "connected",
            "probability": float(pred.get("probability", 0.0)),
            "severity": str(pred.get("severity", "MODERATE")).upper(),
            "confidence": int(pred.get("confidence", 0)),
            "model": endpoint_id
        }

    except Exception as e:
        print(f"Vertex AI prediction error: {e}")
        # Never crash the app on AI failure. Return graceful fallback.
        return {
            "status": "unavailable",
            "probability": None,
            "severity": None,
            "confidence": None,
            "model": None
        }
