-- BigQuery Data Foundation for CycloneShield AI
-- Execute these queries to set up the dataset and tables.

-- 1. Create Dataset
CREATE SCHEMA IF NOT EXISTS `cycloneshield`
OPTIONS(
  location="US"
);

-- 2. Create Cyclone Events Table
-- Historical cyclone events, excluding fabricated records.
CREATE TABLE IF NOT EXISTS `cycloneshield.cyclone_events` (
    event_id STRING NOT NULL,
    event_name STRING,
    event_date DATE,
    basin STRING,
    max_wind_speed FLOAT64,
    rainfall_mm FLOAT64,
    storm_category INT64,
    track_lat FLOAT64,
    track_lng FLOAT64,
    radius_km FLOAT64,
    source STRING
);

-- 3. Create Infrastructure Assets Table
-- Matches the application's infrastructure model.
CREATE TABLE IF NOT EXISTS `cycloneshield.infrastructure_assets` (
    asset_id STRING NOT NULL,
    name STRING,
    asset_type STRING,
    latitude FLOAT64,
    longitude FLOAT64,
    base_vulnerability FLOAT64,
    criticality INT64,
    population_served INT64,
    access_routes INT64,
    location_class STRING
);

-- 4. Create Impact Training Features Table
-- Features used for Vertex AI predictive model training.
-- impact_probability and impact_severity MUST be real historical labels.
CREATE TABLE IF NOT EXISTS `cycloneshield.impact_training_features` (
    event_id STRING NOT NULL,
    asset_id STRING NOT NULL,
    wind_speed FLOAT64,
    rainfall_mm FLOAT64,
    storm_category INT64,
    radius_km FLOAT64,
    track_distance_km FLOAT64,
    asset_vulnerability FLOAT64,
    asset_criticality INT64,
    population_served INT64,
    access_routes INT64,
    elevation_m FLOAT64,
    coastal_exposure FLOAT64,
    impact_probability FLOAT64,
    impact_severity STRING
);
