/**
 * cyclone_exposure.js
 * 
 * Google Earth Engine Script for CycloneShield AI
 * Demonstrates how to extract geospatial context for infrastructure assets.
 */

// 1. Define the Region of Interest (ROI) - Odisha Coast
var roi = ee.Geometry.Rectangle([84.0, 19.0, 87.5, 22.0]);

// 2. Load Elevation Dataset (NASADEM)
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');

// 3. Define the Coastline (Approximated using large water bodies mask)
var waterMask = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('max_extent');
// Distance to water (meters)
var distanceToWater = waterMask.fastDistanceTransform(256).multiply(ee.Image.pixelArea().sqrt());

// 4. Create a unified Geospatial Hazard Context Layer
// We combine elevation and coastal proximity into a normalized exposure index
// For demo purposes: lower elevation + closer to water = higher exposure
var exposureIndex = ee.Image(1.0)
  .subtract(dem.divide(20).clamp(0, 1)) // Penalize elevation < 20m
  .subtract(distanceToWater.divide(5000).clamp(0, 1)); // Penalize distance < 5km

// 5. Visualization Parameters
var elevationVis = {min: 0, max: 100, palette: ['006600', 'df923d', 'ffffff']};
var exposureVis = {min: 0, max: 1, palette: ['white', 'yellow', 'red']};

// 6. Add to Map (in Earth Engine Code Editor)
Map.centerObject(roi, 8);
Map.addLayer(dem.clip(roi), elevationVis, 'Elevation', false);
Map.addLayer(exposureIndex.clip(roi), exposureVis, 'Coastal Exposure Index', true);

/**
 * In the production backend, we extract these values as follows:
 * 
 * var sampled = exposureIndex.sampleRegions({
 *   collection: infrastructureAssetsFeatureCollection,
 *   scale: 30
 * });
 * 
 * Export.table.toDrive(...) or synchronously via REST API (.getInfo())
 */
