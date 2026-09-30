import { demoGeospatialContext } from '../data/geospatialContext';

export async function fetchGeospatialContext(assets) {
  try {
    const response = await fetch('http://localhost:8000/api/geospatial-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assets: assets.map(a => ({ id: a.id, lng: a.x, lat: a.y })) // map to abstract coords for demo
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from backend');
    }

    const result = await response.json();
    
    if (result.status === 'connected' && result.data) {
      return { status: 'connected', data: result.data };
    }
    
    // Backend returned 'demo' status (e.g. Earth Engine not initialized)
    return { status: 'demo', data: demoGeospatialContext };
    
  } catch (err) {
    console.error('Earth Engine Service Error:', err);
    // Silent fallback to demo context if backend is completely unavailable
    return { status: 'demo', data: demoGeospatialContext };
  }
}
