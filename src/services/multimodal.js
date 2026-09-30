const API_URL = 'http://localhost:8000/api';

export async function analyzeMultimodal({
  image,
  source,
  scenario,
  riskSummary,
  criticalAssets,
  highRiskAssets,
  geoContext
}) {
  try {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('source', source);
    formData.append('scenario', JSON.stringify(scenario));
    formData.append('riskSummary', JSON.stringify(riskSummary));
    formData.append('criticalAssets', JSON.stringify(criticalAssets));
    formData.append('highRiskAssets', JSON.stringify(highRiskAssets));
    if (geoContext) {
      formData.append('geoContext', JSON.stringify(geoContext));
    }

    const response = await fetch(`${API_URL}/analyze-multimodal`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Multimodal Analysis Error:', error);
    
    // Provide a graceful fallback on network failure / API unavailable
    return {
      visualSummary: "DEMO — Multimodal Gemini analysis unavailable due to network or configuration issues.",
      sourceAssessment: {
        source: source,
        imageType: "UNKNOWN",
        quality: "POOR",
        limitations: ["Network error or backend unavailable", error.message]
      },
      visualObservations: [],
      infrastructureConcerns: [],
      exposurePathways: [],
      riskContext: [],
      operationalConsiderations: [],
      uncertainties: ["Connection failed"],
      confidence: 0
    };
  }
}
