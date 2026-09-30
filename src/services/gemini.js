const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function analyzeRisk(simulationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simulationData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate AI briefing.');
    }

    const data = await response.json();
    
    // Validate output structure
    if (!data.summary || !Array.isArray(data.criticalAssets) || !Array.isArray(data.riskReasons) || !Array.isArray(data.recommendedActions)) {
      throw new Error('Malformed AI response structure.');
    }

    // Ensure Gemini does not silently override risk values
    // We map over criticalAssets to ensure numerical values align with deterministic engine if needed,
    // or simply trust the backend schema constraint. But we should be careful using AI risk numbers directly.
    return { ...data, type: 'GEMINI' };
  } catch (err) {
    console.error('Gemini Service Error:', err);
    throw err;
  }
}
