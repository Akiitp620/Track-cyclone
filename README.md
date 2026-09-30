# CycloneShield AI
**AI-Powered Cyclone Impact & Infrastructure Vulnerability Digital Twin**

"CycloneShield AI simulates cyclone scenarios and converts them into infrastructure-level risk maps and pre-landfall action plans for disaster-management teams."

## 1. Project Overview
CycloneShield AI is a disaster-management decision-support platform that combines cyclone scenario simulation, geospatial context, deterministic infrastructure risk assessment, Gemini reasoning, and multimodal visual analysis to identify vulnerable infrastructure and generate pre-landfall operational actions. 

*Note: This is a scenario-based decision-support system, not a replacement for official meteorological cyclone forecasting.*

## 2. Problem
During cyclones, emergency operations centers are overwhelmed with raw meteorological data but lack actionable intelligence on how specific infrastructure assets (hospitals, power grids, bridges) will be impacted. Existing tools are either purely deterministic without tactical advice, or purely AI-driven and prone to hallucination.

## 3. Solution
We merge a deterministic risk engine (as the source of truth) with Google Earth Engine (for geospatial context) and Google Gemini (for tactical reasoning). This ensures that numerical risk scores are reliable and mathematically sound, while the AI generates actionable, situation-specific operational plans.

## 4. Core Workflow
1. User simulates a cyclone scenario (intensity, rainfall, track shift).
2. The **DETERMINISTIC RISK ENGINE** calculates risk scores for mapped infrastructure assets.
3. The **GEOSPATIAL CONTEXT** (Earth Engine) modifies hazard levels based on physical geography.
4. The **GEMINI REASONING LAYER** translates the data array into a human-readable operational action plan.
5. The **MULTIMODAL VISUAL INTERPRETATION** allows visual evidence (drone footage/maps) to be analyzed alongside the structured scenario data.

## 5. Architecture
```text
User Scenario
      ↓
Deterministic Risk Engine  <--  Earth Engine (Geospatial Context)
      ↓
  Risk Results
      ↓
   Gemini
      ↓
Explanation + Action Plan
```

## 6. Risk Methodology
The system relies on a **DETERMINISTIC RISK ENGINE** (JavaScript) for all core calculations. 
Risk is a product of:
`Risk Score = Hazard × Exposure × Vulnerability × Category Multiplier`
Hazard intensity is calculated using wind speeds, rainfall, track shift, and coastal exposure, diminishing over distance.

## 7. Gemini Role
The **GEMINI REASONING LAYER** processes the numerical output of the risk engine to generate tactical summarizations and operational action plans broken down by timeframes. **Gemini never modifies numerical risk scores.**

## 8. Gemini Multimodal Role
**MULTIMODAL VISUAL INTERPRETATION** integrates Gemini's multimodal capabilities to analyze visual evidence (such as infrastructure imagery, aerial photos, or map screenshots) in tandem with the deterministic scenario context.

## 9. Earth Engine Role
Google Earth Engine provides real-world **GEOSPATIAL CONTEXT** (Elevation, Coastal Exposure) which feeds into the deterministic Risk Engine's hazard calculation.

## 10. Vertex AI Role
Vertex AI serves as the **PREDICTIVE MODEL LAYER**, meant for generating secondary "Impact Probability and Severity" signals trained on historical infrastructure-impact data to augment deterministic models.

## 11. BigQuery Role
Google BigQuery acts as the **SCALABLE DATA LAYER**, providing the feature store for preparing, storing, and managing the historical impact datasets required for predictive model training.

## 12. Google Technology Stack

| Technology | Current Role | Status |
|---|---|---|
| **Gemini** | Explanation and action planning | FALLBACK/CONNECTED depending on environment |
| **Gemini Multimodal** | Visual evidence interpretation | FALLBACK/CONNECTED depending on credentials |
| **Earth Engine** | Geospatial context | CONNECTED |
| **Vertex AI** | Predictive infrastructure-impact model layer | UNAVAILABLE until validated model endpoint exists |
| **BigQuery** | Scalable data/training layer | UNAVAILABLE until configured |
| **Cloud Run** | Backend deployment target | IMPLEMENTED |

*Note: We do not claim unavailable services are live.*

## 13. Demo Mode
To ensure the application always functions even without API keys or internet access, CycloneShield features a seamless fallback Demo Mode. If Earth Engine is unauthenticated, it uses cached geospatial data. If Gemini is unavailable, it generates a deterministic operational briefing. Any demo images used in multimodal analysis are explicitly labeled as `DEMO EVIDENCE`.

## 14. Data Provenance
- **Infrastructure Assets:** Highly realistic mock assets designed to prove the architecture.
- **Geospatial Context:** Proxied/Mocked via Earth Engine fallback boundaries.
- **Historical Labels:** Not currently available.

## 15. Local Setup
Requires Node.js 18+ and Python 3.10+.

### 16. Environment Variables
Copy the example environment file in the `backend` directory:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and add your real API keys if you have them:
```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MULTIMODAL_MODEL=gemini-2.5-flash
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ENDPOINT_ID=your_endpoint_id
BIGQUERY_DATASET=cycloneshield
BIGQUERY_LOCATION=US
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://localhost:8000`.

### Frontend Setup
In a new terminal window:
```bash
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## 17. Deployment
The backend can be deployed via Docker to Google Cloud Run, ensuring environment variables are securely passed via Secret Manager. The frontend is a static Vite build deployable to Firebase Hosting. Run `npm run build` to generate the production assets.

## 18. Limitations
- The current prototype simulates hazards as single-point radial distributions.
- A production version requires complex time-series wind-field polygons tracking across a 72-hour forecast.
- The predictive model layer relies on verified historical infrastructure-impact labels which are not publicly available for this prototype.

## 19. Future Improvements
- Integration with real-time satellite imagery APIs.
- Dynamic time-series rendering of cyclone progress across 72 hours.
- Automated alert dispatch to ground personnel via Firebase Cloud Messaging.
