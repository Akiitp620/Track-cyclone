import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for risk categories
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const icons = {
  CRITICAL: createIcon('#DC2626'), // red
  HIGH: createIcon('#F59E0B'),     // orange
  MEDIUM: createIcon('#EAB308'),   // amber/yellow
  LOW: createIcon('#16A34A')       // green
};

// Map component helper to auto-resize
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
};

// Projection logic
const toLat = (y) => 21.5 - (y / 100) * 2;
const toLng = (x) => 85.0 + (x / 100) * 2.5;

export function InteractiveMap({
  scenario,
  results,
  selectedAssetId,
  setSelectedAssetId,
  showCoastalLayer,
  showElevationLayer
}) {
  const mapRef = useRef(null);

  const cycloneLat = toLat(90); // bottom 10%
  const cycloneLng = toLng(50 + (scenario.trackShift || 0));

  // The track line goes from South to North
  const trackPath = [
    [toLat(100), toLng(50 + (scenario.trackShift || 0))], // further south
    [cycloneLat, cycloneLng],
    [toLat(0), toLng(50 + (scenario.trackShift || 0))] // landfall / north
  ];

  const center = [20.5, 86.25]; // Center of Odisha bounding box

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <MapContainer
        center={center}
        zoom={7}
        style={{ flex: 1, minHeight: 0, width: '100%' }}
        ref={mapRef}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* Coastal Layer Visualization (Simplified) */}
        {showCoastalLayer && (
          <div className="leaflet-pane leaflet-overlay-pane" style={{ zIndex: 400 }}>
            {/* Real implementation would use GeoJSON, for now we simulate via Circle/Polygon if needed, or omit for now */}
          </div>
        )}

        {/* Cyclone Track */}
        <Polyline positions={trackPath} color="rgba(0, 0, 0, 0.5)" dashArray="5, 10" weight={2} />

        {/* Cyclone Position */}
        <Circle
          center={[cycloneLat, cycloneLng]}
          radius={scenario.radius * 1000} // scenario.radius is typically km
          pathOptions={{
            color: 'rgba(220, 38, 38, 0.8)',
            fillColor: 'rgba(220, 38, 38, 0.2)',
            fillOpacity: 0.5,
            weight: 1
          }}
        />

        {/* Assets */}
        {results.map((asset) => {
          const lat = toLat(asset.y);
          const lng = toLng(asset.x);

          return (
            <Marker
              key={asset.id}
              position={[lat, lng]}
              icon={icons[asset.category] || icons.LOW}
              eventHandlers={{
                click: () => {
                  setSelectedAssetId(asset.id);
                }
              }}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>{asset.name}</h3>
                  <div style={{ fontSize: '12px', marginBottom: '8px', color: '#666' }}>{asset.type}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px' }}>
                    <strong>Risk Category:</strong> <span style={{ color: asset.category === 'CRITICAL' ? '#DC2626' : asset.category === 'HIGH' ? '#F59E0B' : asset.category === 'MEDIUM' ? '#EAB308' : '#16A34A' }}>{asset.category}</span>
                    <strong>Risk Score:</strong> <span>{asset.risk}</span>
                    <strong>Hazard:</strong> <span>{asset.hazard?.toFixed(2) ?? "—"}</span>
                    <strong>Vulnerability:</strong> <span>{asset.baseVulnerability?.toFixed(2) ?? "—"}</span>
                    <strong>Exposure:</strong> <span>{asset.exposure?.toFixed(2) ?? "—"}</span>
                    <strong>Pop. Served:</strong> <span>{asset.populationServed.toLocaleString()}</span>
                    <strong>Access Routes:</strong> <span>{asset.accessRoutes}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>RISK ZONES</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#DC2626', marginRight: '8px' }}></div> Critical
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B', marginRight: '8px' }}></div> High
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EAB308', marginRight: '8px' }}></div> Medium
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#16A34A', marginRight: '8px' }}></div> Low
        </div>

        <div style={{ borderTop: '1px solid #ccc', margin: '8px 0' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '2px', backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '1px dashed #000', marginRight: '8px' }}></div> Track
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(220, 38, 38, 0.2)', border: '1px solid rgba(220, 38, 38, 0.8)', marginRight: '8px' }}></div> Hazard Zone
        </div>
      </div>
    </div>
  );
}
