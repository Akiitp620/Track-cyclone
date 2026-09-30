# Submission Copy

### A. 50-word description
CycloneShield AI is a disaster-management decision-support platform that combines cyclone scenario simulation, deterministic infrastructure risk assessment, geospatial context, and Gemini reasoning to identify vulnerable infrastructure and generate immediate pre-landfall operational actions.

### B. 100-word description
CycloneShield AI transforms raw meteorological forecasts into actionable intelligence. During a cyclone, emergency operations centers are overwhelmed with weather data but lack insight into which specific infrastructure assets will fail. CycloneShield AI combines a highly auditable deterministic risk engine with Google Earth Engine's geospatial context to pinpoint vulnerable infrastructure. It then leverages Google Gemini and Gemini Multimodal as a reasoning layer to synthesize simulation output and visual evidence into practical, time-bound operational action plans, helping disaster response teams act before impact.

### C. 250-word detailed description
CycloneShield AI is an advanced decision-support digital twin for emergency operations centers (EOCs). While most cyclone dashboards stop at predicting the storm's path, CycloneShield focuses entirely on ground impact and operational readiness. 

The platform allows users to simulate dynamic cyclone scenarios (intensity, rainfall, track shift) against a mapped infrastructure grid. A deterministic risk engine—the single, mathematical source of truth—calculates localized risk scores by combining the hazard profile with each asset's exposure, vulnerability, and real-world physical geospatial context drawn from Google Earth Engine.

Because disaster response requires immediate clarity, we utilize Google Gemini not to calculate risk, but as a robust reasoning layer. Gemini processes the complex numerical output arrays to generate human-readable tactical briefings and operational action plans broken down into urgent timeframes (0-6 hours, 6-12 hours). Furthermore, Gemini Multimodal allows commanders to upload visual evidence—such as aerial drone footage or satellite screenshots—for AI-driven visual interpretation alongside the simulation context. 

Architected for future scalability, the platform is structured to ingest historical infrastructure-impact records into Google BigQuery, allowing Google Vertex AI to train a secondary predictive impact model. Built with strict fail-safes, CycloneShield AI guarantees that even if external APIs become unavailable, the deterministic engine gracefully degrades into fallback mode ensuring zero operational downtime for responders.

### D. Problem statement
During cyclones, emergency operations centers are overwhelmed with raw meteorological data but lack actionable intelligence on how specific infrastructure assets (hospitals, power grids, bridges) will actually be impacted, resulting in reactive rather than proactive disaster management.

### E. Solution
We merge a deterministic risk engine (as the authoritative source of truth) with Google Earth Engine (for geospatial context) and Google Gemini (for tactical reasoning) to instantly identify vulnerable infrastructure and generate pre-landfall operational action plans.

### F. Innovation
Separating mathematical risk calculation from AI reasoning. By strictly isolating the deterministic risk engine from Gemini, we eliminate the danger of AI hallucination in critical severity scoring, while fully capitalizing on generative AI's unmatched ability to quickly synthesize complex data into operational guidance and interpret multimodal visual evidence.

### G. Technology used
- **Google Gemini & Gemini Multimodal:** Reasoning layer and visual interpretation.
- **Google Earth Engine:** Geospatial physical context.
- **Google BigQuery & Vertex AI:** Target architecture for historical data storage and predictive impact modeling.
- **Frontend:** React, Vite, JavaScript, JSX.
- **Backend:** Python, FastAPI, deployed to Google Cloud Run.

### H. Expected impact
Empowering disaster response teams to shift from guessing where the worst damage might occur to deploying preventative reinforcement and repair crews exactly where they are needed hours before landfall.

### I. Scalability
The platform is designed to ingest massive national infrastructure shapefiles via a secure BigQuery enclave, scaling compute securely across Google Cloud Run, and capable of integrating with live national meteorological APIs.

### J. Limitations
The current prototype simulates hazards as single-point radial distributions. A production version requires complex time-series wind-field polygons tracking across a 72-hour forecast, and relies on verified historical infrastructure-impact labels to train the future Vertex AI predictive models.
