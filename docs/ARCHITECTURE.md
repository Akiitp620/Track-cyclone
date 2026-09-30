# Architecture

CycloneShield AI employs a multi-layered architecture separating deterministic risk scoring from generative AI reasoning.

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

### Visual Layer

```text
Visual Evidence
      +
Simulation Context
      ↓
Gemini Multimodal
      ↓
Visual Interpretation
```

### Future / Validated Predictive Layer

To augment the deterministic core, the architecture integrates a scalable predictive model pipeline, structurally prepared for when verified ground-truth labels are available.

```text
Historical Impact Data
      ↓
   BigQuery
      ↓
Validated Training Dataset
      ↓
   Vertex AI
      ↓
Infrastructure Impact Prediction
```

*Note: It is explicit that the predictive layer must use real, observed impact labels (e.g. historical insurance claims or disaster-relief assessments) rather than the deterministic risk score as its training target to prevent recursive modeling.*
