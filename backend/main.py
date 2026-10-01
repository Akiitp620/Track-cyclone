import os
import json
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from dotenv import load_dotenv
from google import genai
from google.genai import types

import earth_engine
import vertex_ai
import bigquery
import multimodal

load_dotenv()

app = FastAPI()

frontend_origin = os.getenv("FRONTEND_ORIGIN")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

if frontend_origin and frontend_origin not in allowed_origins:
    allowed_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class AssetLocation(BaseModel):
    id: str
    lng: float
    lat: float

class GeospatialRequest(BaseModel):
    assets: List[AssetLocation]

class ScenarioModel(BaseModel):
    intensity: Optional[int] = None
    rainfall: Optional[int] = None
    trackShift: Optional[int] = None
    windSpeed: Optional[int] = None
    category: Optional[int] = None
    radius: Optional[int] = None

class RiskSummaryModel(BaseModel):
    criticalCount: int
    highCount: int
    populationExposed: int

class PredictiveImpactModel(BaseModel):
    status: str
    probability: Optional[float] = None
    severity: Optional[str] = None
    confidence: Optional[int] = None
    model: Optional[str] = None

class AssetModel(BaseModel):
    name: str
    type: str
    risk: int
    vulnerability: float
    populationServed: int
    accessRoutes: int
    predictiveImpact: Optional[PredictiveImpactModel] = None

class AnalyzeRiskRequest(BaseModel):
    scenario: ScenarioModel
    riskSummary: RiskSummaryModel
    criticalAssets: List[AssetModel]
    highRiskAssets: List[AssetModel]

class PredictionFeatures(BaseModel):
    hazard: float
    exposure: float
    vulnerability: float
    windSpeed: int
    rainfall: int
    radius: int
    category: int
    coastalExposure: float
    elevation: float

class PredictImpactRequest(BaseModel):
    scenario: ScenarioModel
    asset: dict
    features: PredictionFeatures

# Response Models (for Gemini Structured Output)
class RecommendedAction(BaseModel):
    priority: str
    action: str
    asset: str
    timeframe: str

class CriticalAssetAnalysis(BaseModel):
    asset: str
    risk: int
    reason: str

class AIResponseSchema(BaseModel):
    summary: str
    criticalAssets: list[CriticalAssetAnalysis]
    riskReasons: list[str]
    recommendedActions: list[RecommendedAction]
    confidence: int

@app.post("/api/geospatial-context")
async def get_geospatial_context(request: GeospatialRequest):
    """
    Attempts to fetch live Google Earth Engine data for the provided assets.
    If Earth Engine is not configured or fails, returns status: demo.
    """
    # Convert Pydantic models to dicts for the EE module
    assets_dict = [a.model_dump() for a in request.assets]

    geo_context = await earth_engine.get_geospatial_features(assets_dict)

    if geo_context is None:
        return {"status": "demo", "data": None}

    return {"status": "connected", "data": geo_context}

@app.get("/api/geospatial-context")
async def get_geospatial_context_get():
    """
    Returns actual Earth Engine elevation for all infrastructure assets.
    """
    assets = bigquery.fetch_infrastructure_assets()
    if assets is None:
        return {
            "status": "unavailable",
            "source": "demo",
            "dataset": None,
            "count": 0,
            "assets": []
        }

    elevations = await earth_engine.get_elevation_data(assets)
    if elevations is None:
        return {
            "status": "unavailable",
            "source": "demo",
            "dataset": None,
            "count": 0,
            "assets": []
        }

    return {
        "status": "connected",
        "source": "earth_engine",
        "dataset": "USGS/SRTMGL1_003",
        "count": len(elevations),
        "assets": elevations
    }

@app.post("/api/satellite-evidence")
async def get_satellite_evidence(request: GeospatialRequest):
    """
    Attempts to fetch real Sentinel-1 satellite evidence for the provided assets.
    """
    if not earth_engine.initialize_earth_engine():
        return {
            "status": "unavailable",
            "reason": "Earth Engine not configured",
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD"
        }

    assets_dict = [a.model_dump() for a in request.assets]
    evidence = await earth_engine.get_satellite_evidence(assets_dict)

    if evidence is None:
        return {
            "status": "unavailable",
            "reason": "Failed to retrieve evidence",
            "source": "earth_engine",
            "dataset": "COPERNICUS/S1_GRD"
        }

    return evidence

@app.post("/api/predict-impact")
async def predict_impact(request: PredictImpactRequest):
    features_dict = request.features.model_dump()
    result = vertex_ai.predict_impact(features_dict)

    if result["status"] == "connected":
        prob = result.get("probability")
        conf = result.get("confidence")
        sev = result.get("severity")
        if prob is None or not (0 <= prob <= 1):
            result["status"] = "invalid"
        elif conf is None or not (0 <= conf <= 100):
            result["status"] = "invalid"
        elif sev not in ["LOW", "MODERATE", "SEVERE"]:
            result["status"] = "invalid"

    if result["status"] == "invalid":
        return {
            "status": "unavailable",
            "probability": None,
            "severity": None,
            "confidence": None,
            "model": None
        }

    return result

@app.get("/api/data-status")
async def get_data_status():
    """
    Returns the status of all data layer integrations.
    """
    bq_status = bigquery.check_status()

    # Check Vertex AI by seeing if it's configured
    vertex_project = os.getenv("GOOGLE_CLOUD_PROJECT")
    vertex_endpoint = os.getenv("VERTEX_AI_ENDPOINT_ID")

    vertex_status = {"status": "configured"} if vertex_project and vertex_endpoint else {"status": "unavailable"}

    # Earth Engine
    ee_initialized = await earth_engine.check_status()
    ee_status = {"status": "connected"} if ee_initialized else {"status": "demo"}

    # Gemini
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_status = {"status": "configured"} if gemini_api_key else {"status": "not_configured"}

    return {
        "bigquery": bq_status,
        "vertexAI": vertex_status,
        "earthEngine": ee_status,
        "gemini": gemini_status
    }

@app.get("/api/infrastructure-assets")
def get_infrastructure_assets():
    """
    Returns infrastructure assets from BigQuery.
    If BigQuery is unavailable, returns a fallback status so the frontend can use local demo data.
    """
    assets = bigquery.fetch_infrastructure_assets()

    if assets is None:
        return {
            "status": "fallback",
            "source": "demo",
            "count": 0,
            "assets": []
        }

    return {
        "status": "connected",
        "source": "bigquery",
        "project": os.getenv("GOOGLE_CLOUD_PROJECT", "sanqum"),
        "dataset": os.getenv("BIGQUERY_DATASET", "cycloneshield"),
        "count": len(assets),
        "assets": assets
    }

@app.post("/api/analyze-risk")
async def analyze_risk(request: AnalyzeRiskRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API Key not configured on backend.")

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
        You are a disaster-response decision-support assistant.
        You are given deterministic scenario analysis produced by a separate risk engine.
        Do not modify or recalculate numerical risk scores.
        Explain the scenario, identify the most consequential infrastructure risks, explain the contributing factors, and recommend practical pre-landfall actions.
        For actions, assign a timeframe: "0-6 HOURS", "6-12 HOURS", or "12-24 HOURS". Focus on operational actions (e.g. "Inspect backup power and pre-position repair crew").
        Treat all information as scenario-based rather than certain prediction.
        Do not claim to replace official meteorological or emergency authorities.
        Some assets include a 'predictiveImpact' object from Vertex AI. Use this as an additional predictive signal (probability and severity) to inform your reasoning and recommendations, but DO NOT overwrite the deterministic 'risk' scores.

        Scenario: Category {request.scenario.category} with {request.scenario.windSpeed} km/h winds, {request.scenario.rainfall} mm rainfall, {request.scenario.radius} km radius.
        Track Shift: {request.scenario.trackShift} km.

        Risk Summary:
        - Critical Assets: {request.riskSummary.criticalCount}
        - High Risk Assets: {request.riskSummary.highCount}
        - Population Exposed: {request.riskSummary.populationExposed}

        Critical Assets:
        {[a.model_dump() for a in request.criticalAssets]}

        High Risk Assets:
        {[a.model_dump() for a in request.highRiskAssets]}
        """

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIResponseSchema,
                temperature=0.2,
            )
        )

        # Parse the JSON response
        data = json.loads(response.text)
        return data

    except Exception as e:
        # Log server side, return clean error to frontend
        print(f"Error calling Gemini: {str(e)}")
        raise HTTPException(status_code=503, detail="AI analysis failed during request processing.")

@app.post("/api/analyze-multimodal")
async def analyze_multimodal(
    image: UploadFile = File(...),
    source: str = Form(...),
    scenario: str = Form(...),
    riskSummary: str = Form(...),
    criticalAssets: str = Form(...),
    highRiskAssets: str = Form(...),
    geoContext: str = Form(None)
):
    valid_mime_types = ["image/jpeg", "image/png", "image/webp"]
    if image.content_type not in valid_mime_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {image.content_type}")

    # Read the image content
    try:
        content = await image.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to read image")

    # Check max size (e.g. 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit")

    # Parse JSON fields
    try:
        scenario_dict = json.loads(scenario)
        risk_summary_dict = json.loads(riskSummary)
        critical_assets_list = json.loads(criticalAssets)
        high_risk_assets_list = json.loads(highRiskAssets)
        geo_context_dict = json.loads(geoContext) if geoContext else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in form data")

    result = multimodal.analyze_multimodal_image(
        image_bytes=content,
        mime_type=image.content_type,
        source=source,
        scenario=scenario_dict,
        risk_summary=risk_summary_dict,
        critical_assets=critical_assets_list,
        high_risk_assets=high_risk_assets_list,
        geo_context=geo_context_dict
    )

    if result is None:
        raise HTTPException(status_code=500, detail="Multimodal analysis failed")

    return result
