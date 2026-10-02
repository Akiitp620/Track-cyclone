# 🌪️ CycloneShield AI

### AI-Powered Cyclone Impact & Infrastructure Vulnerability Digital Twin

> **From cyclone scenarios to infrastructure-level risk and pre-landfall action.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-2563EB?style=flat-square)](https://track-cyclone.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Cloud%20Run-4285F4?style=flat-square)](https://cycloneshield-backend-1044987833811.asia-south1.run.app/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Integrated-4285F4?style=flat-square)](https://cloud.google.com/)
[![Google Earth Engine](https://img.shields.io/badge/Earth%20Engine-Integrated-34A853?style=flat-square)](https://earthengine.google.com/)

---

## 📌 Overview

When a cyclone approaches, knowing its projected path is only the beginning.

The harder question for disaster-management teams is:

> **“If this scenario happens, which infrastructure is most at risk, how many people could be exposed, and what should we prioritize before landfall?”**

**CycloneShield AI** is a decision-support platform that converts cyclone scenarios into **infrastructure-level risk assessments and pre-landfall action plans**.

Instead of displaying only a cyclone track or weather conditions, CycloneShield connects:

**Cyclone Scenario → Hazard → Infrastructure Exposure → Vulnerability → Risk → Priority Actions**

The system combines structured infrastructure data, geospatial context, a deterministic risk engine, and AI-assisted reasoning to help teams move from **hazard awareness to actionable preparedness**.

> CycloneShield is a decision-support prototype. It does not replace official meteorological forecasts, warnings, or emergency-management authorities.

---

# 🎯 Problem

Cyclone preparedness often involves multiple information sources:

- Cyclone track and intensity
- Rainfall and hazard conditions
- Infrastructure locations
- Population served
- Infrastructure criticality
- Vulnerability
- Geographic conditions
- Satellite and geospatial observations

The challenge is that these datasets do not automatically answer the operational question:

> **Which infrastructure should receive attention first under a specific cyclone scenario?**

A cyclone may affect hospitals, bridges, power infrastructure, telecom assets, shelters, and other critical facilities differently.

A conventional cyclone visualization can show **where the hazard is**.

But disaster-management teams also need to understand:

- Which assets fall into high or critical risk?
- How does changing the cyclone scenario change infrastructure exposure?
- Which assets serve large populations?
- Which infrastructure has higher vulnerability or criticality?
- What actions should be prioritized before landfall?

**CycloneShield AI addresses this decision gap.**

---

# 💡 Solution

CycloneShield provides an interactive **cyclone impact simulation and infrastructure risk layer**.

A user can modify a cyclone scenario using parameters such as:

- Wind speed
- Rainfall
- Hazard radius
- Cyclone track shift

The system then recalculates infrastructure risk using a deterministic risk engine.

### Core Flow

```text
Cyclone Scenario
       ↓
Hazard Calculation
       ↓
Infrastructure Exposure
       ↓
Vulnerability + Criticality
       ↓
Deterministic Risk Engine
       ↓
Infrastructure Risk Map
       ↓
Priority Assets
       ↓
Pre-Landfall Action Plan
```

This allows users to ask:

> **“If this cyclone scenario occurs, which assets need attention first?”**

---

# 🌍 Community Track Alignment

## Primary Track: Resilience

CycloneShield directly supports community resilience by helping disaster-management teams evaluate infrastructure vulnerability **before a cyclone reaches the affected region**.

The platform focuses on:

- Infrastructure resilience
- Disaster preparedness
- Pre-landfall prioritization
- Population exposure
- Geospatial risk assessment
- Critical infrastructure protection

The goal is not simply to visualize a disaster, but to help translate a potential hazard into **preparedness decisions**.

---

# ✨ Key Features

## 1. 🌀 Scenario Simulator

Users can stress-test different cyclone scenarios by changing:

- Wind speed
- Rainfall
- Track shift
- Hazard radius

The system recalculates infrastructure-level risk after the scenario is applied.

---

## 2. 🗺️ Infrastructure Risk Map

An interactive Leaflet-based map visualizes infrastructure assets according to their calculated risk level.

### Risk Classification

| Score | Risk Level |
|---:|---|
| 0–30 | Low |
| 31–60 | Medium |
| 61–80 | High |
| 81–100 | Critical |

The map connects the simulated hazard region with infrastructure locations.

---

## 3. 🏗️ Infrastructure Risk Dossier

Each infrastructure asset contains structured information including:

- Asset name
- Asset type
- Geographic location
- Population served
- Criticality
- Access routes
- Base vulnerability
- Calculated hazard
- Calculated risk
- Risk category

The current prototype uses **35 structured infrastructure assets** stored in BigQuery.

---

## 4. 📊 Population Exposure

The system aggregates population served by infrastructure assets falling into the simulated risk zone.

This provides a second perspective beyond individual assets:

> **Which infrastructure is at risk, and how many people could be affected through those assets?**

---

## 5. 🛰️ Google Earth Engine Integration

CycloneShield uses Google Earth Engine for geospatial context.

### SRTM Elevation

```text
USGS/SRTMGL1_003
```

Used for elevation context around infrastructure assets.

### Sentinel-1 Radar

```text
COPERNICUS/S1_GRD
```

Used to retrieve radar scene availability and backscatter evidence around infrastructure locations.

Earth Engine provides **geospatial evidence and context**; it is not treated as a cyclone failure predictor.

---

## 6. 🗄️ BigQuery Infrastructure Layer

Infrastructure assets are stored in:

```text
sanqum.cycloneshield.infrastructure_assets
```

The current connected dataset contains:

```text
35 infrastructure assets
```

BigQuery provides the structured data layer used by the risk engine.

---

## 7. 🧠 Deterministic Risk Engine

The underlying infrastructure risk calculation is deterministic.

Conceptually:

```text
Risk Score =
Hazard × Exposure × Vulnerability × Category Multiplier
```

The engine considers factors including:

- Wind intensity
- Rainfall
- Distance from simulated cyclone track
- Hazard radius
- Population served
- Infrastructure criticality
- Access-route availability
- Base vulnerability
- Category-specific weighting

This ensures that the underlying risk score is **reproducible and explainable**.

---

## 8. 🤖 Gemini-Assisted Reasoning

Gemini is used as an **additional reasoning layer** over structured simulation results.

It can be used to:

- Summarize the calculated risk
- Explain major risk drivers
- Generate operational briefings
- Convert structured results into action-oriented guidance

The underlying risk score is **not arbitrarily generated by the LLM**.

The architecture follows:

```text
Deterministic Risk Engine
          ↓
Structured Risk Results
          ↓
Gemini
          ↓
Explanation / Briefing / Action Guidance
```

If Gemini is unavailable, CycloneShield continues using the deterministic risk engine and displays a fallback briefing.

---

# ☁️ Google Cloud Architecture

CycloneShield uses Google Cloud services across its data, backend, authentication, geospatial, and AI layers.

```text
                         USER
                           │
                           ▼
                  ┌─────────────────┐
                  │ React + Vite UI │
                  │    Vercel       │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Firebase Auth   │
                  │ Email/Password  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ FastAPI Backend │
                  │   Cloud Run     │
                  └───────┬─────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
      ┌──────────┐ ┌─────────────┐ ┌────────────┐
      │ BigQuery │ │ Earth Engine│ │ Gemini API │
      │          │ │             │ │            │
      │ Infra    │ │ SRTM +      │ │ Reasoning  │
      │ Data     │ │ Sentinel-1  │ │ & Briefing │
      └──────────┘ └─────────────┘ └────────────┘
            │             │
            └──────┬──────┘
                   ▼
          ┌────────────────────┐
          │ Deterministic Risk │
          │      Engine        │
          └──────────┬─────────┘
                     │
                     ▼
          ┌────────────────────┐
          │ Risk Map + Action  │
          │      Plan          │
          └────────────────────┘

             Optional Future Layer
                     │
                     ▼
          ┌────────────────────┐
          │     Vertex AI      │
          │ Predictive Impact  │
          │       Model        │
          └────────────────────┘
```

### Google Technologies Used

| Technology | Role |
|---|---|
| **Google Cloud Run** | FastAPI backend deployment |
| **BigQuery** | Infrastructure data layer |
| **Google Earth Engine** | Elevation and satellite/radar geospatial context |
| **Gemini API** | AI reasoning, briefings and action guidance |
| **Firebase Authentication** | User authentication |
| **Vertex AI** | Optional future predictive impact layer |
| **Google Cloud Secret Manager** | Production secret management |

---

# 🧮 Risk Engine

CycloneShield deliberately separates **risk calculation** from **AI explanation**.

## Step 1 — Hazard

The scenario generates a normalized hazard factor using:

- Wind speed
- Rainfall
- Distance from simulated track
- Hazard radius
- Geographic exposure

## Step 2 — Exposure

Infrastructure exposure considers factors such as:

- Population served
- Infrastructure criticality
- Access routes

## Step 3 — Vulnerability

Each infrastructure asset has a base vulnerability value.

## Step 4 — Risk

The factors are combined into a normalized risk score.

```text
Risk =
Hazard × Exposure × Vulnerability × Category Multiplier
```

## Step 5 — Classification

```text
0–30     → Low
31–60    → Medium
61–80    → High
81–100   → Critical
```

This separation makes the system easier to inspect, reproduce, and extend.

---

# 🛠️ Technology Stack

## Frontend

- React
- Vite
- JavaScript / JSX
- Tailwind CSS
- Lucide React
- Leaflet
- React Leaflet

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Google Cloud libraries

## AI

- Gemini API
- `@google/genai`
- Optional Vertex AI integration

## Geospatial

- Google Earth Engine
- SRTM
- Sentinel-1
- Leaflet

## Data

- Google BigQuery

## Authentication

- Firebase Authentication
- Email/Password authentication

## Deployment

- Vercel — Frontend
- Google Cloud Run — Backend
- Google Cloud Secret Manager — Secrets

---

# 📁 Project Structure

```text
Track-cyclone/
│
├── src/
│   ├── components/
│   │   ├── InteractiveMap.jsx
│   │   └── ...
│   │
│   ├── services/
│   │   ├── earthEngine.js
│   │   ├── vertexAI.js
│   │   └── ...
│   │
│   ├── App.jsx
│   └── ...
│
├── backend/
│   ├── main.py
│   ├── bigquery.py
│   ├── earth_engine.py
│   ├── requirements.txt
│   └── ...
│
├── data/
│   └── bigquery/
│
├── earth-engine/
│   └── ...
│
├── docs/
│   └── ...
│
├── public/
│
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

---

# 🚀 Running Locally

## Prerequisites

Install:

- Node.js 18+
- Python 3.10+
- Git

For full Google Cloud functionality, you will additionally need:

- Google Cloud project
- BigQuery access
- Earth Engine access
- Firebase project
- Gemini API access

---

## 1. Clone the Repository

```bash
git clone https://github.com/Akitp620/Track-cyclone.git
cd Track-cyclone
```

---

# 2. Frontend Setup

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

Example:

```env
VITE_API_BASE_URL=http://localhost:8000

VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_USE_FIREBASE_EMULATOR=false
```

> Never commit `.env.local` or real credentials to GitHub.

Start the frontend:

```bash
npm run dev
```

The Vite development server will provide the local frontend URL.

---

# 3. Backend Setup

Open another terminal:

```bash
cd backend
```

Create a virtual environment.

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Backend Environment Variables

Example:

```env
GOOGLE_CLOUD_PROJECT=sanqum
BIGQUERY_DATASET=cycloneshield

GEMINI_API_KEY=your_gemini_api_key

FRONTEND_ORIGIN=http://localhost:5173
```

For local Google Cloud authentication:

```bash
gcloud auth application-default login
```

Then run:

```bash
uvicorn main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

# 🛰️ Earth Engine Setup

For Earth Engine functionality, authenticate with Google Cloud:

```bash
earthengine authenticate --auth_mode=gcloud \
  --scopes=https://www.googleapis.com/auth/earthengine,https://www.googleapis.com/auth/cloud-platform
```

Initialize and verify the project:

```bash
python -c "import ee; ee.Initialize(project='sanqum'); print(ee.Number(1).getInfo())"
```

Expected output:

```text
1
```

Earth Engine access is required for the connected geospatial functionality.

---

# 🗄️ BigQuery Setup

CycloneShield expects the following dataset:

```text
sanqum.cycloneshield
```

Current tables:

```text
cyclone_events
infrastructure_assets
impact_training_features
```

The primary infrastructure table contains:

```text
asset_id
name
asset_type
latitude
longitude
base_vulnerability
criticality
population_served
access_routes
location_class
```

The application maps these records into the frontend risk engine.

---

# 🔌 Important API Endpoints

The FastAPI backend exposes the core integration endpoints.

| Endpoint | Purpose |
|---|---|
| `GET /api/data-status` | Checks BigQuery, Earth Engine, Gemini and Vertex AI status |
| `GET /api/infrastructure-assets` | Retrieves infrastructure assets |
| `GET /api/geospatial-context` | Retrieves Earth Engine elevation context |
| `POST /api/satellite-evidence` | Retrieves Sentinel-1 evidence |
| `POST /api/analyze-risk` | Generates AI-assisted risk reasoning |
| `POST /api/predict-impact` | Optional predictive impact endpoint |

Swagger documentation is available locally at:

```text
http://localhost:8000/docs
```

---

# 🧪 Demo / Fallback Behavior

CycloneShield is designed so that the core simulation does not depend entirely on external AI availability.

## Deterministic Mode

The following remain usable without Gemini:

- Scenario simulation
- Infrastructure risk calculation
- Risk classification
- Risk map
- Population exposure
- Infrastructure prioritization
- Core action-plan logic

## Gemini Unavailable

If Gemini is unavailable because of:

- API quota
- Billing
- Temporary service failure
- Missing credentials

the application falls back to deterministic briefing logic.

The system does **not** fabricate AI-generated observations when the AI service is unavailable.

---

# ☁️ Production Deployment

## Frontend

The production frontend is deployed on Vercel:

**Live Application**

https://track-cyclone.vercel.app/

The frontend uses:

```env
VITE_API_BASE_URL
```

to communicate with the backend.

---

## Backend

The FastAPI backend is deployed on Google Cloud Run.

Production service:

```text
cycloneshield-backend
```

Region:

```text
asia-south1
```

The production backend connects to:

- BigQuery
- Google Earth Engine
- Gemini API
- Google Cloud services

Secrets are supplied through Google Cloud Secret Manager rather than committed to the repository.

---

# 🔐 Security

CycloneShield follows a separation between application code and credentials.

## Secrets Are Not Committed to Git

Sensitive values such as:

```text
GEMINI_API_KEY
Firebase credentials
Google Cloud credentials
```

are provided through environment variables or managed cloud secrets.

## Frontend

The frontend does not directly contain the Gemini API key.

AI requests are routed through the backend.

## Production

Google Cloud Secret Manager is used for production secret injection.

---

# 📊 Current Prototype Status

| Component | Status |
|---|---|
| React/Vite frontend | ✅ Integrated |
| Firebase Authentication | ✅ Integrated |
| FastAPI backend | ✅ Integrated |
| Cloud Run | ✅ Deployed |
| BigQuery | ✅ Connected |
| Infrastructure assets | ✅ 35 records |
| Earth Engine | ✅ Connected |
| SRTM elevation | ✅ Connected |
| Sentinel-1 | ✅ Connected |
| Deterministic Risk Engine | ✅ Active |
| Gemini reasoning | ⚠️ Fallback when unavailable |
| Vertex AI predictive model | 🔵 Optional / Future |

### Important Distinction

The current prototype does **not** claim that Vertex AI is already providing trained cyclone-impact predictions.

Vertex AI is designed as an optional future predictive layer once sufficient historical training data and a validated model are available.

---

# 🧭 User Flow

```text
1. Login
   ↓
2. Open Command Center
   ↓
3. Select / modify cyclone scenario
   ↓
4. Run simulation
   ↓
5. Calculate infrastructure-level risk
   ↓
6. Inspect risk map
   ↓
7. Open Infrastructure Risk
   ↓
8. Identify priority assets
   ↓
9. Open Action Plan
   ↓
10. Review pre-landfall priorities
   ↓
11. Inspect Data & Method
```

---

# 🎬 Demo Scenario

For the project demonstration, an extreme cyclone scenario can be simulated with:

```text
Wind Speed       : 280 km/h
Rainfall         : 600 mm
Track Shift      : -20 km
Hazard Radius    : 250 km
```

The system then recalculates the infrastructure risk distribution.

Example prototype output:

```text
Critical Assets       3
High-Risk Assets      5
Assets at Risk        8
Population Exposed    ~2.67M
```

These values are **scenario outputs from the prototype risk engine**, not official cyclone forecasts or predictions.

---

# 🧩 Why This Architecture?

CycloneShield intentionally separates three responsibilities.

## 1. Data

> **What is on the ground?**

BigQuery and Earth Engine provide structured infrastructure and geospatial context.

## 2. Risk

> **What happens to those assets under this scenario?**

The deterministic risk engine calculates reproducible infrastructure risk.

## 3. Reasoning

> **What should a decision-maker understand or do next?**

Gemini converts structured results into human-readable briefings and action guidance when available.

This separation makes the system easier to inspect and prevents an LLM from becoming an opaque source of the underlying risk score.

---

# 🚧 Limitations

CycloneShield is a prototype decision-support system.

Current limitations include:

- The cyclone scenario is user-defined rather than an official forecast.
- The current infrastructure dataset is limited to the prototype's structured assets.
- The deterministic risk engine is a simulation model, not an officially calibrated disaster model.
- Sentinel-1 evidence currently provides radar scene and backscatter context; it should not be interpreted as validated flood-detection output.
- Vertex AI predictive modeling is not currently deployed.
- Gemini availability depends on API access and quota.
- Real-world deployment would require validation against historical cyclone events and infrastructure damage or failure datasets.

---

# 🔮 Future Roadmap

## Phase 1 — Current Prototype

- Infrastructure risk simulation
- BigQuery integration
- Earth Engine integration
- Sentinel-1 context
- Interactive risk map
- Firebase authentication
- Gemini-assisted reasoning

## Phase 2 — Historical Validation

- Historical cyclone event ingestion
- Historical infrastructure damage records
- Risk-model calibration
- Backtesting against past cyclone events

## Phase 3 — Predictive Impact Modeling

- Feature engineering from historical events
- Train validated impact models
- Deploy model through Vertex AI
- Predict probability and severity of infrastructure impact

## Phase 4 — Operational Scale

- Live cyclone feeds
- Regional infrastructure datasets
- Automated scenario updates
- Disaster-management organization workflows
- Multi-region deployment
- Mobile / responder interface

---

# 🏆 Hackathon Submission Checklist

CycloneShield satisfies the core submission requirements.

## ✅ Theme Alignment

**Resilience**

The application focuses on cyclone preparedness, infrastructure vulnerability, population exposure, and pre-landfall decision support.

## ✅ Code Repository

Public GitHub repository:

https://github.com/Akitp620/Track-cyclone

The repository contains:

- Application code
- Backend
- Frontend
- Configuration examples
- Running instructions
- Project documentation

## ✅ Architecture Overview

The architecture documents integration between:

```text
React/Vite
    ↓
Firebase
    ↓
Cloud Run / FastAPI
    ↓
BigQuery + Earth Engine + Gemini
    ↓
Risk Engine
    ↓
Action Plan
```

## ✅ Project Pitch

The project addresses a real community resilience problem:

> **How can disaster-management teams translate a cyclone scenario into infrastructure-level priorities before landfall?**

CycloneShield provides a simulation-based decision-support layer to help answer that question.

---

# ⚠️ Disclaimer

CycloneShield AI is a hackathon/research prototype for disaster-risk decision support.

It does not replace:

- Official meteorological forecasts
- Government cyclone warnings
- Emergency-management authorities
- Professional engineering assessments

Scenario results should not be treated as official predictions or as the sole basis for real-world emergency decisions.

---

# 👥 Team

**CycloneShield AI**

Built for the **Code for Communities / Hack2Skill** challenge under the **Resilience** track.

---

# ⭐ One-Line Pitch

> **CycloneShield AI turns cyclone scenarios into infrastructure-level risk maps and pre-landfall action plans, helping communities understand not just where the cyclone may go, but which critical assets need attention first.**