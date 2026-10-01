import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel

class SourceAssessment(BaseModel):
    source: str
    imageType: str
    quality: str
    limitations: list[str]

class VisualObservation(BaseModel):
    observation: str
    confidence: int

class InfrastructureConcern(BaseModel):
    asset: str
    concern: str
    evidence: str

class RiskContextItem(BaseModel):
    asset: str
    deterministicRisk: int
    visualRelevance: str

class OperationalConsideration(BaseModel):
    priority: str
    action: str

class MultimodalResponseSchema(BaseModel):
    visualSummary: str
    sourceAssessment: SourceAssessment
    visualObservations: list[VisualObservation]
    infrastructureConcerns: list[InfrastructureConcern]
    exposurePathways: list[str]
    riskContext: list[RiskContextItem]
    operationalConsiderations: list[OperationalConsideration]
    uncertainties: list[str]
    confidence: int

def analyze_multimodal_image(image_bytes: bytes, mime_type: str, source: str, scenario: dict, risk_summary: dict, critical_assets: list, high_risk_assets: list, geo_context: dict):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MULTIMODAL_MODEL") or os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    print(f"GEMINI KEY FOUND: {bool(api_key)}")
    print(f"MODEL: {model_name}")

    if not api_key:
        return _get_demo_response(source)

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
You are CycloneShield AI's visual disaster-response analysis assistant.

You are analyzing visual evidence together with deterministic cyclone simulation results.

The deterministic risk engine is authoritative for numerical risk.

Do NOT calculate, change, or override numerical risk scores.

Your task is to:
1. describe only visually supported observations
2. identify visible infrastructure/environmental features
3. identify visible potential exposure pathways
4. connect visual observations to the supplied deterministic risk context
5. identify inconsistencies or uncertainty
6. suggest operational considerations for disaster-management teams

Rules:
- Never claim an image is satellite imagery unless the source metadata explicitly says so.
- Never invent roads, buildings, hospitals, bridges, rivers, coastlines, or other objects that are not reasonably visible.
- Never infer exact geographic coordinates from visual appearance alone.
- Never claim an observation is real-time unless explicitly provided as real-time data.
- Do not modify deterministic risk scores.
- Clearly separate visual observations from contextual interpretation.
- If the image quality is insufficient, say so.
- If the image does not contain enough evidence, say so.
- Treat user-provided/demo images as visual evidence only, not as authoritative geospatial truth.
- The 'confidence' field should represent confidence in the VISUAL INTERPRETATION only (0-100).

Return ONLY valid JSON with this exact structure:
{{
  "visualSummary": "Detailed string summary",
  "sourceAssessment": {{
    "source": "{source}",
    "imageType": "SATELLITE | DRONE | GROUND | UNKNOWN",
    "quality": "HIGH | MEDIUM | LOW | LIMITED",
    "limitations": ["list of strings"]
  }},
  "visualObservations": [
    {{"observation": "string", "confidence": number}}
  ],
  "infrastructureConcerns": [
    {"asset": "string", "concern": "string", "evidence": "string"}
  ],
  "exposurePathways": ["list of strings"],
  "riskContext": ["list of strings"],
  "operationalConsiderations": [
    {"priority": "HIGH | MEDIUM | LOW", "action": "string"}
  ],
  "uncertainties": ["list of strings"],
  "confidence": number
}}

Contextual Data:
Source Label: {source}
Scenario: {json.dumps(scenario)}
Risk Summary: {json.dumps(risk_summary)}
Critical Assets: {json.dumps(critical_assets)}
High Risk Assets: {json.dumps(high_risk_assets)}
Geo Context: {json.dumps(geo_context)}
"""

        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )

        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)
        return data

    except Exception as e:
        print(f"Error in multimodal analysis: {e}")
        return _get_api_error_response(source)

def _get_api_error_response(source: str):
    return {
        "visualSummary": "DEMO — Multimodal Gemini analysis unavailable due to API error (e.g., quota exceeded or server unavailable).",
        "sourceAssessment": {
            "source": source,
            "imageType": "UNKNOWN",
            "quality": "LIMITED",
            "limitations": ["API error", "Demo mode active"]
        },
        "visualObservations": [
            {
                "observation": "Visual analysis is disabled due to an API error.",
                "confidence": 0
            }
        ],
        "infrastructureConcerns": [],
        "exposurePathways": [],
        "riskContext": [],
        "operationalConsiderations": [],
        "uncertainties": ["All visual interpretation is unavailable."],
        "confidence": 0
    }

def _get_demo_response(source: str):
    return {
        "visualSummary": "DEMO — Multimodal Gemini analysis unavailable. This is a fallback summary indicating that AI vision analysis cannot be performed because no valid API key is configured.",
        "sourceAssessment": {
            "source": source,
            "imageType": "UNKNOWN",
            "quality": "LIMITED",
            "limitations": ["API key missing", "Demo mode active"]
        },
        "visualObservations": [
            {
                "observation": "Visual analysis is disabled in demo mode.",
                "confidence": 0
            }
        ],
        "infrastructureConcerns": [],
        "exposurePathways": [],
        "riskContext": [],
        "operationalConsiderations": [],
        "uncertainties": ["All visual interpretation is unavailable."],
        "confidence": 0
    }
