/**
 * DEMO / CACHED GEOSPATIAL CONTEXT
 * 
 * This file serves as the fallback dataset when the live Google Earth Engine 
 * backend is unavailable or lacks credentials.
 * It provides cached geospatial context (Elevation, Coastal Exposure) 
 * for the 35 demonstration infrastructure assets.
 */

export const demoGeospatialContext = {};

for (let i = 0; i < 35; i++) {
  // Deterministic procedural generation for cached demo data
  // Using pseudo-random but fixed values based on index
  const pseudoY = ((i * 17) % 100);
  
  // Coast is assumed to be higher Y in our coordinate system
  const isCoastal = pseudoY > 60;
  
  let elevation;
  if (isCoastal) {
    elevation = 2 + (i % 8); // 2m to 9m
  } else {
    elevation = 15 + (i % 30); // 15m to 44m
  }

  // Higher coastal exposure for lower elevation and proximity to "coast"
  let coastalExposure = 0.1;
  if (isCoastal) {
    coastalExposure = 0.6 + ((10 - elevation) / 25);
  } else if (elevation < 20) {
    coastalExposure = 0.3;
  }
  
  demoGeospatialContext[`asset-${i}`] = {
    elevation: elevation,
    coastalExposure: Math.min(0.95, Math.max(0.1, coastalExposure))
  };
}
