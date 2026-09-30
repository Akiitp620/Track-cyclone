export async function predictImpact(features) {
  try {
    const response = await fetch('http://localhost:8000/api/predict-impact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(features)
    });

    if (!response.ok) {
      // Don't throw for predictive intelligence to prevent breaking core deterministic loop
      return {
        status: "unavailable",
        probability: null,
        severity: null,
        confidence: null,
        model: null
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Vertex AI Service Error:', err);
    return {
      status: "unavailable",
      probability: null,
      severity: null,
      confidence: null,
      model: null
    };
  }
}
