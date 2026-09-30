# Judge Q&A

**Q1. What problem are you solving?**
During cyclones, emergency operations centers are overwhelmed with raw meteorological data but lack actionable intelligence on how specific infrastructure assets (hospitals, power grids, bridges) will be impacted.

**Q2. What makes this different from a weather app?**
Weather apps show what the storm is doing. CycloneShield AI focuses exclusively on the ground impact: identifying which specific infrastructure will fail and providing a timeline of preventative operational actions.

**Q3. How is the risk score calculated?**
It is a deterministic mathematical calculation: `Risk Score = Hazard × Exposure × Vulnerability × Category Multiplier`. Hazard intensity is factored by wind speeds, rainfall, track shift, and coastal exposure mapped from Earth Engine, diminishing over distance.

**Q4. Why use Gemini?**
Gemini rapidly translates complex numerical arrays (the raw simulation output) into human-readable tactical summarizations and operational action plans broken down by timeframes (0-6 hours, 6-12 hours). It excels at operational reasoning.

**Q5. Why use Gemini Multimodal?**
To ingest and interpret on-the-ground visual evidence—such as satellite imagery, aerial drone photos, or map screenshots—alongside the structured numerical simulation context to gain situational awareness that raw data cannot provide alone.

**Q6. What does Earth Engine contribute?**
Earth Engine provides the real-world physical geospatial context—such as exact Elevation and Coastal Exposure—which is necessary to calculate true physical hazard in the deterministic risk engine.

**Q7. Why is the risk engine deterministic?**
Because in disaster management, core severity and risk numbers must be completely transparent, auditable, mathematically reproducible, and free from AI hallucination.

**Q8. Can Gemini change the risk score?**
No. The deterministic risk engine is authoritative. Gemini is used for interpretation and operational guidance.

**Q9. Is this a cyclone prediction system?**
No. It is a scenario-based decision-support system. Official meteorological forecasts remain authoritative.

**Q10. Where does Vertex AI fit?**
Vertex AI is our target predictive-model layer. Once we ingest sufficient verified historical infrastructure-damage labels, Vertex AI will generate a secondary "Impact Probability and Severity" predictive signal that complements the deterministic risk engine.

**Q11. Where does BigQuery fit?**
BigQuery is the scalable data layer that will act as the feature store for our historical training datasets, enabling the continuous retraining of the Vertex AI impact prediction models.

**Q12. What happens when Google APIs are unavailable?**
The system is built with fail-safes. If Gemini, Vertex AI, BigQuery, or Earth Engine are unconfigured, rate-limited, or unavailable, they degrade gracefully into localized fallback mode. The deterministic risk engine continues unaffected.

**Q13. What data are you using?**
Currently, we are using mock simulation bounds mapped against mock infrastructural distributions for the hackathon prototype. Real world elevation/coastal proxies are simulated through the Earth Engine boundary layer.

**Q14. Are the infrastructure assets live government infrastructure data?**
No, they are highly realistic mock assets designed to prove the architecture. We do not claim to possess or expose sensitive live national infrastructure grids.

**Q15. How would you scale this nationally?**
We would connect the system to national meteorological APIs, ingest classified national infrastructure shapefiles via a secure BigQuery enclave, and scale the FastAPI backend securely via Google Cloud Run.

**Q16. How would you validate the predictive model?**
By backtesting our risk engine outputs against actual damage reports (insurance claims, FEMA-style assessments) from past cyclones, using BigQuery and Vertex AI to score the model's precision and recall.

**Q17. What prevents AI hallucination from changing the risk?**
The AI (Gemini) is given the risk score strictly in the prompt block as immutable context. The numerical rendering on the map and the UI tables are drawn strictly from the deterministic JavaScript engine, entirely bypassing Gemini for data display.

**Q18. What is the biggest limitation of the current prototype?**
The current prototype simulates hazards as single-point radial distributions. A production version would require complex time-series wind-field polygons mapping across a 72-hour track.

**Q19. How could disaster-management authorities use this?**
As their primary "Pre-Landfall Action Dashboard" inside an Emergency Operations Center (EOC). Instead of looking at radar, they would look at this to see which assets to reinforce immediately.

**Q20. What would you build next?**
Integration with real-time satellite imagery APIs, dynamic time-series rendering of the cyclone progress, and automated alert dispatches to ground repair crews via Firebase Cloud Messaging.
