import { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, LayoutDashboard, SlidersHorizontal, Activity, 
  Map as MapIcon, Database, Play, Layers, AlertTriangle, Users, 
  Wind, Navigation, Droplets, Target, Crosshair
} from 'lucide-react';
import { 
  INFRASTRUCTURE_ASSETS, 
  calculateRisk, 
  getScenarioCategory 
} from './engine/riskEngine';
import { AIBriefing } from './components/AIBriefing';
import MultimodalAnalysis from './components/MultimodalAnalysis';
import { fetchGeospatialContext } from './services/earthEngine';
import { predictImpact } from './services/vertexAI';

function App() {
  const [activeTab, setActiveTab] = useState('COMMAND CENTER');
  
  // Draft State (Sliders)
  const [draftWindSpeed, setDraftWindSpeed] = useState(180);
  const [draftRadius, setDraftRadius] = useState(120);
  const [draftRainfall, setDraftRainfall] = useState(250);
  const [draftTrackShift, setDraftTrackShift] = useState(0);

  // Active State (Applied)
  const [scenario, setScenario] = useState({
    windSpeed: 180,
    radius: 120,
    rainfall: 250,
    trackShift: 0,
    category: getScenarioCategory(180)
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  
  // Geospatial Context State
  const [geoContext, setGeoContext] = useState(null);
  const [showCoastalLayer, setShowCoastalLayer] = useState(false);
  const [showElevationLayer, setShowElevationLayer] = useState(false);
  
  const [dataSourceStatus, setDataSourceStatus] = useState({
    earthEngine: 'loading',
    gemini: 'connected',
    infrastructure: 'demo',
    meteorologicalData: 'scenario',
    vertexAI: 'UNAVAILABLE',
    bigquery: 'UNAVAILABLE'
  });
  
  const [predictiveImpacts, setPredictiveImpacts] = useState({});

  useEffect(() => {
    async function loadGeoContext() {
      const result = await fetchGeospatialContext(INFRASTRUCTURE_ASSETS);
      setGeoContext(result.data);
      setDataSourceStatus(prev => ({ ...prev, earthEngine: result.status }));
    }
    loadGeoContext();
    
    async function loadDataStatus() {
      try {
        const res = await fetch('http://localhost:8000/api/data-status');
        const data = await res.json();
        setDataSourceStatus(prev => ({ 
            ...prev, 
            bigquery: data.bigquery.status.toUpperCase(),
            vertexAI: data.vertexAI.status.toUpperCase()
        }));
      } catch (e) {
        console.error("Failed to fetch data status", e);
      }
    }
    loadDataStatus();
  }, []);

  // Derive risk results
  const results = useMemo(() => {
    return INFRASTRUCTURE_ASSETS.map(asset => calculateRisk(scenario, asset, geoContext));
  }, [scenario, geoContext]);

  const criticalAssets = results.filter(r => r.category === 'CRITICAL').length;
  const highRiskAssets = results.filter(r => r.category === 'HIGH').length;
  
  useEffect(() => {
    async function fetchPredictions() {
      const targets = results.filter(r => r.category === 'CRITICAL' || r.category === 'HIGH').slice(0, 5);
      const newImpacts = {};
      let anyConnected = false;
      let anyInvalid = false;
      
      for (const asset of targets) {
        const features = {
          hazard: asset.hazard,
          exposure: asset.exposure,
          vulnerability: asset.vulnerability,
          windSpeed: scenario.windSpeed,
          rainfall: scenario.rainfall,
          radius: scenario.radius,
          category: scenario.category,
          coastalExposure: geoContext?.[asset.id]?.coastalExposure || 0,
          elevation: geoContext?.[asset.id]?.elevation || 0
        };
        const res = await predictImpact({ scenario, asset, features });
        if (res.status === 'connected') {
            anyConnected = true;
            newImpacts[asset.id] = res;
        } else if (res.status === 'invalid') {
            anyInvalid = true;
        }
      }
      setPredictiveImpacts(newImpacts);
      setDataSourceStatus(prev => ({
        ...prev, 
        vertexAI: anyConnected ? 'CONNECTED' : (anyInvalid ? 'INVALID' : 'UNAVAILABLE')
      }));
    }
    
    if (!isSimulating && results.length > 0) {
        fetchPredictions();
    }
  }, [scenario, results, isSimulating, geoContext]);
  
  // Only count population if hazard > 0.2
  const popExposed = results.reduce((acc, r) => r.hazard > 0.2 ? acc + r.populationServed : acc, 0);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setScenario({
        windSpeed: draftWindSpeed,
        radius: draftRadius,
        rainfall: draftRainfall,
        trackShift: draftTrackShift,
        category: getScenarioCategory(draftWindSpeed)
      });
      setIsSimulating(false);
    }, 400); // Quick operation feel
  };

  const applyPreset = (preset) => {
    if (preset === 'MODERATE') {
      setDraftWindSpeed(100); setDraftRadius(80); setDraftRainfall(100); setDraftTrackShift(25);
    } else if (preset === 'SEVERE') {
      setDraftWindSpeed(180); setDraftRadius(150); setDraftRainfall(300); setDraftTrackShift(0);
    } else if (preset === 'EXTREME') {
      setDraftWindSpeed(280); setDraftRadius(250); setDraftRainfall(600); setDraftTrackShift(-20);
    }
  };

  const selectedAsset = results.find(r => r.id === selectedAssetId);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <ShieldAlert size={20} color="var(--primary)" />
            CYCLONESHIELD
          </div>
          <div className="brand-subtitle">CYCLONE INTELLIGENCE</div>
        </div>
        
        <nav className="nav-menu">
          {[
            { id: 'COMMAND CENTER', icon: LayoutDashboard },
            { id: 'SCENARIO SIMULATOR', icon: SlidersHorizontal },
            { id: 'INFRASTRUCTURE RISK', icon: Activity },
            { id: 'ACTION PLAN', icon: MapIcon },
            { id: 'DATA & METHOD', icon: Database },
          ].map(item => (
            <div 
              key={item.id} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} />
              {item.id}
            </div>
          ))}
        </nav>

        <div className="system-status">
          <div className="status-label">DATA PROVENANCE</div>
          <div className="status-item">
            <div className={`status-dot ${dataSourceStatus.earthEngine === 'connected' ? 'bg-low' : 'bg-medium'}`}></div>
            Earth Engine ({dataSourceStatus.earthEngine.toUpperCase()})
          </div>
          <div className="status-item">
            <div className={`status-dot ${dataSourceStatus.gemini === 'connected' ? 'bg-low' : 'bg-medium'}`}></div>
            Gemini AI (API / FALLBACK)
          </div>
          <div className="status-item">
            <div className={`status-dot ${dataSourceStatus.bigquery === 'CONNECTED' ? 'bg-low' : 'bg-medium'}`}></div>
            BigQuery ({dataSourceStatus.bigquery})
          </div>
          <div className="status-item">
            <div className={`status-dot ${dataSourceStatus.vertexAI === 'CONNECTED' ? 'bg-low' : 'bg-medium'}`}></div>
            Vertex AI ({dataSourceStatus.vertexAI})
          </div>
          <div className="status-item">
            <div className="status-dot bg-low"></div>
            Risk Engine (DETERMINISTIC)
          </div>
          <div className="status-item">
            <div className="status-dot bg-medium"></div>
            Infrastructure ({dataSourceStatus.infrastructure.toUpperCase()})
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">{activeTab}</h1>
            <div className="page-subtitle">Cyclone impact overview and infrastructure exposure.</div>
          </div>
          <div className="header-right">
            <div className="badge badge-active">
              <span className="status-dot active"></span>
              SIMULATION ACTIVE
            </div>
            <div className="badge badge-outline">ODISHA COAST</div>
            <div className="badge badge-outline" style={{ color: 'var(--text-secondary)' }}>
              {new Date().toISOString().substring(11, 16)} UTC
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="content-scrollable">
          
          {/* RESET BUTTON IN HEADER */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 100 }}>
             <button 
                className="badge badge-outline" 
                style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} 
                onClick={() => applyPreset('MODERATE')}
                title="Reset to default moderate scenario"
              >
                RESET SCENARIO
             </button>
          </div>

          {activeTab === 'COMMAND CENTER' && (
            <>
              {/* KPI Row */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">CRITICAL ASSETS</span>
                <AlertTriangle size={16} className="color-critical" />
              </div>
              <div className="kpi-value">{criticalAssets.toString().padStart(2, '0')}</div>
              <div className="kpi-footer">Exceeding safe vulnerability threshold</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">HIGH RISK ASSETS</span>
                <Activity size={16} className="color-high" />
              </div>
              <div className="kpi-value">{highRiskAssets.toString().padStart(2, '0')}</div>
              <div className="kpi-footer">Requires immediate observation</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">POPULATION EXPOSED</span>
                <Users size={16} className="color-primary" />
              </div>
              <div className="kpi-value">{(popExposed / 1000000).toFixed(2)}M</div>
              <div className="kpi-footer">Within active hazard zone</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-label">INFRASTRUCTURE AT RISK</span>
                <Activity size={16} className="color-medium" />
              </div>
              <div className="kpi-value">{results.length.toString().padStart(2, '0')}</div>
              <div className="kpi-footer">Monitored regional assets</div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Left Column: Map + Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* GIS Map Panel */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <MapIcon size={16} color="var(--text-secondary)" />
                    GEOSPATIAL HAZARD PROJECTION
                  </div>
                </div>
                <div className="map-container" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Pseudo-map graphics */}
                  <div 
                    style={{ 
                      left: `${50 + scenario.trackShift}%`, 
                      width: '2px', 
                      background: 'rgba(255,255,255,0.1)', 
                      position: 'absolute', 
                      top: 0, 
                      bottom: 0,
                      transform: 'translateX(-50%)',
                      borderLeft: '1px dashed rgba(255,255,255,0.3)'
                    }}
                  ></div>
                  <div style={{ position: 'absolute', left: `${50 + scenario.trackShift}%`, bottom: '10%', transform: 'translate(-50%, 50%)' }}>
                    <div style={{
                      width: `${scenario.radius}px`, 
                      height: `${scenario.radius}px`, 
                      background: 'radial-gradient(circle, rgba(220,38,38,0.2) 0%, rgba(220,38,38,0) 70%)', 
                      borderRadius: '50%', 
                      zIndex: 1
                    }}></div>
                  </div>
                  
                  {/* Coastal Exposure Background Gradient (Geospatial layer) */}
                  {showCoastalLayer && (
                    <div style={{
                      position: 'absolute',
                      left: 0, right: 0, bottom: 0, height: '40%',
                      background: 'linear-gradient(to top, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 100%)',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}></div>
                  )}

                  {/* Elevation Background Gradient (Geospatial layer) */}
                  {showElevationLayer && (
                    <div style={{
                      position: 'absolute',
                      left: 0, right: 0, top: 0, height: '100%',
                      background: 'radial-gradient(circle at 50% 10%, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0) 60%)',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}></div>
                  )}
                  
                  <div style={{ position: 'absolute', bottom: '5px', left: `${50 + scenario.trackShift + 2}%`, fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>SIMULATED TRACK</div>

                  {/* Asset Markers */}
                  {results.map(r => (
                    <div 
                      key={r.id}
                      className={`map-marker bg-${r.category.toLowerCase()} ${selectedAssetId === r.id ? 'selected-marker' : ''}`}
                      style={{ 
                        top: `${r.y}%`, 
                        left: `${r.x}%`, 
                        cursor: 'pointer',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: selectedAssetId === r.id ? '0 0 0 4px rgba(255,255,255,0.3)' : 'none'
                      }}
                      onClick={() => setSelectedAssetId(r.id)}
                      title={r.name}
                    ></div>
                  ))}

                  {/* Map Controls */}
                  <div className="map-controls">
                    <button className="map-btn" title="Toggle Coastal Exposure" onClick={() => setShowCoastalLayer(!showCoastalLayer)}>
                      <Droplets size={16} color={showCoastalLayer ? 'var(--primary)' : 'inherit'} />
                    </button>
                    <button className="map-btn" title="Toggle Elevation" onClick={() => setShowElevationLayer(!showElevationLayer)}>
                      <Layers size={16} color={showElevationLayer ? 'var(--primary)' : 'inherit'} />
                    </button>
                  </div>

                  {/* Map Legend */}
                  <div className="map-legend">
                    <div style={{fontWeight: 600, marginBottom: '8px'}}>RISK ZONES</div>
                    <div className="legend-item"><div className="legend-color bg-critical"></div> Critical</div>
                    <div className="legend-item"><div className="legend-color bg-high"></div> High</div>
                    <div className="legend-item"><div className="legend-color bg-medium"></div> Medium</div>
                    <div className="legend-item"><div className="legend-color bg-low"></div> Low</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Controls + AI Brief */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* AI Briefing Panel */}
              <AIBriefing scenario={scenario} results={results} predictiveImpacts={predictiveImpacts} />
              
              <MultimodalAnalysis 
                scenario={scenario} 
                riskSummary={{ 
                  criticalAssetsCount: criticalAssets, 
                  highRiskAssetsCount: highRiskAssets, 
                  popExposed, 
                  totalRiskSum: results.reduce((acc, curr) => acc + curr.risk, 0) 
                }} 
                criticalAssets={results.filter(r => r.category === 'CRITICAL').map(r => r.name)} 
                highRiskAssets={results.filter(r => r.category === 'HIGH').map(r => r.name)} 
                geoContext={geoContext} 
              />
              
            </div>
          </div>
          </>
          )}

          {activeTab === 'INFRASTRUCTURE RISK' && (
            <div className="dashboard-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <Database size={16} color="var(--text-secondary)" />
                      ASSET EXPOSURE DOSSIER
                    </div>
                  </div>
                  <div style={{ padding: '0', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Asset Name</th>
                          <th>Type</th>
                          <th>Location</th>
                          <th>Risk Score</th>
                          <th>Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => {
                          return (
                            <tr 
                              key={result.id} 
                              style={{ cursor: 'pointer', background: selectedAssetId === result.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                              onClick={() => setSelectedAssetId(result.id)}
                            >
                              <td style={{ fontWeight: 500 }}>{result.name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{result.type.replace('_', ' ')}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{result.location}</td>
                              <td style={{ fontWeight: 600 }}>{result.risk}/100</td>
                              <td>
                                <span className={`risk-badge badge-${result.category.toLowerCase()}`}>
                                  {result.category}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Asset Detail Panel */}
              {selectedAsset && (
                <div className="panel" style={{ border: '1px solid var(--border)' }}>
                  <div className="panel-header">
                    <div className="panel-title">
                      <Crosshair size={16} color="var(--text-secondary)" />
                      ASSET DETAIL
                    </div>
                    <button className="badge badge-outline" style={{cursor: 'pointer'}} onClick={() => setSelectedAssetId(null)}>✕</button>
                  </div>
                  <div className="panel-body">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{selectedAsset.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>TYPE</div>
                        <div style={{ fontSize: '13px' }}>{selectedAsset.type.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>RISK SCORE</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }} className={`color-${selectedAsset.category.toLowerCase()}`}>
                          {selectedAsset.risk}/100 ({selectedAsset.category})
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>VULNERABILITY</div>
                        <div style={{ fontSize: '13px' }}>{(selectedAsset.baseVulnerability * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>POPULATION SERVED</div>
                        <div style={{ fontSize: '13px' }}>{selectedAsset.populationServed.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>CRITICALITY</div>
                        <div style={{ fontSize: '13px' }}>{selectedAsset.criticality}/5</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>ACCESS ROUTES</div>
                        <div style={{ fontSize: '13px' }}>{selectedAsset.accessRoutes}</div>
                      </div>
                      
                      {geoContext && geoContext[selectedAsset.id] && (
                        <>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              ELEVATION {dataSourceStatus.earthEngine === 'demo' && '(DEMO)'}
                            </div>
                            <div style={{ fontSize: '13px' }}>{geoContext[selectedAsset.id].elevation} m</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              COASTAL EXPOSURE {dataSourceStatus.earthEngine === 'demo' && '(DEMO)'}
                            </div>
                            <div style={{ fontSize: '13px' }}>
                              {geoContext[selectedAsset.id].coastalExposure > 0.6 ? 'HIGH' : geoContext[selectedAsset.id].coastalExposure > 0.3 ? 'MEDIUM' : 'LOW'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>PREDICTIVE IMPACT</div>
                      {predictiveImpacts[selectedAsset.id] && predictiveImpacts[selectedAsset.id].status === 'connected' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                           <div>
                             <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>IMPACT PROBABILITY</div>
                             <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{(predictiveImpacts[selectedAsset.id].probability * 100).toFixed(0)}%</div>
                           </div>
                           <div>
                             <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>SEVERITY</div>
                             <div style={{ fontSize: '13px', fontWeight: 'bold' }} className={`color-${predictiveImpacts[selectedAsset.id].severity.toLowerCase()}`}>
                               {predictiveImpacts[selectedAsset.id].severity}
                             </div>
                           </div>
                           <div>
                             <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>MODEL CONFIDENCE</div>
                             <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{predictiveImpacts[selectedAsset.id].confidence}%</div>
                           </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                           Prediction unavailable
                        </div>
                      )}
                    </div>
                    
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>RECOMMENDED RESPONSE</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        {selectedAsset.category === 'CRITICAL' && selectedAsset.type === 'HOSPITAL' && 'Initiate emergency power protocol. Prepare for immediate evacuation if flooding exceeds 0.5m.'}
                        {selectedAsset.category === 'CRITICAL' && selectedAsset.type === 'POWER_GRID' && 'Mandatory system shutdown sequence. Deploy backup generators to critical sectors.'}
                        {selectedAsset.category === 'CRITICAL' && selectedAsset.type === 'BRIDGE' && 'Close bridge to all traffic immediately. Inspect structural supports for stress.'}
                        {selectedAsset.category === 'CRITICAL' && !['HOSPITAL', 'POWER_GRID', 'BRIDGE'].includes(selectedAsset.type) && 'Evacuate personnel. Secure loose equipment. Standby for damage assessment.'}
                        {selectedAsset.category === 'HIGH' && 'Increase monitoring frequency to 1hr. Stage emergency repair crews nearby.'}
                        {selectedAsset.category === 'MEDIUM' && 'Review operational protocols. Ensure regular communication updates.'}
                        {selectedAsset.category === 'LOW' && 'Continue standard monitoring. No immediate action required.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {!selectedAsset && (
                <div className="panel" style={{ border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                  Select an asset from the dossier to view details.
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'SCENARIO SIMULATOR' && (
            <div className="dashboard-grid">
               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <SlidersHorizontal size={16} color="var(--text-secondary)" />
                      SCENARIO PARAMETERS
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="badge badge-outline" style={{cursor: 'pointer'}} onClick={() => applyPreset('MODERATE')}>MODERATE</button>
                      <button className="badge badge-outline" style={{cursor: 'pointer'}} onClick={() => applyPreset('SEVERE')}>SEVERE</button>
                      <button className="badge badge-outline" style={{cursor: 'pointer'}} onClick={() => applyPreset('EXTREME')}>EXTREME</button>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="control-group">
                      <div className="control-label">
                        <span><Wind size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> CYCLONE INTENSITY</span>
                        <span className="color-high">{draftWindSpeed} km/h</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track"></div>
                        <div className="slider-fill" style={{ width: `${(draftWindSpeed - 50) / 3}%` }}></div>
                        <input type="range" min="50" max="350" value={draftWindSpeed} onChange={e => setDraftWindSpeed(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Droplets size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> RAINFALL</span>
                        <span className="color-primary">{draftRainfall} mm</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track"></div>
                        <div className="slider-fill" style={{ width: `${(draftRainfall) / 10}%` }}></div>
                        <input type="range" min="0" max="1000" step="10" value={draftRainfall} onChange={e => setDraftRainfall(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Crosshair size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> TRACK SHIFT</span>
                        <span className="color-medium">{draftTrackShift > 0 ? `+${draftTrackShift}` : draftTrackShift} km</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track"></div>
                        <div className="slider-fill" style={{ width: `${(draftTrackShift + 50)}%`, background: 'var(--text-secondary)' }}></div>
                        <input type="range" min="-50" max="50" step="1" value={draftTrackShift} onChange={e => setDraftTrackShift(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Target size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/> HAZARD RADIUS</span>
                        <span className="color-primary">{draftRadius} km</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track"></div>
                        <div className="slider-fill" style={{ width: `${(draftRadius - 50) / 4.5}%` }}></div>
                        <input type="range" min="50" max="500" step="10" value={draftRadius} onChange={e => setDraftRadius(Number(e.target.value))} />
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary btn-full" 
                      style={{ marginTop: '32px', padding: '16px' }}
                      onClick={handleSimulate}
                      disabled={isSimulating}
                    >
                      <Play size={16} />
                      {isSimulating ? 'ANALYZING SCENARIO...' : 'RUN IMPACT SIMULATION'}
                    </button>
                  </div>
                </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 <div className="panel">
                   <div className="panel-header">
                      <div className="panel-title">SCENARIO IMPACT SUMMARY</div>
                   </div>
                   <div className="panel-body">
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Current applied scenario results in:</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                        <span>Critical Assets:</span> <span className="color-critical" style={{fontWeight: 'bold'}}>{criticalAssets}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                        <span>High Risk Assets:</span> <span className="color-high" style={{fontWeight: 'bold'}}>{highRiskAssets}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Population Exposed:</span> <span className="color-primary" style={{fontWeight: 'bold'}}>{(popExposed / 1000000).toFixed(2)}M</span>
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'ACTION PLAN' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
               <AIBriefing scenario={scenario} results={results} predictiveImpacts={predictiveImpacts} fullView={true} />
               
               <MultimodalAnalysis 
                 scenario={scenario} 
                 riskSummary={{ 
                   criticalAssetsCount: criticalAssets, 
                   highRiskAssetsCount: highRiskAssets, 
                   popExposed, 
                   totalRiskSum: results.reduce((acc, curr) => acc + curr.risk, 0) 
                 }} 
                 criticalAssets={results.filter(r => r.category === 'CRITICAL').map(r => r.name)} 
                 highRiskAssets={results.filter(r => r.category === 'HIGH').map(r => r.name)} 
                 geoContext={geoContext} 
               />
            </div>
          )}

          {activeTab === 'DATA & METHOD' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">ARCHITECTURE & DATA PROVENANCE</div>
              </div>
              <div className="panel-body" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>System Architecture</h3>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)', overflowX: 'auto', marginBottom: '24px' }}>
{`DATA SOURCES
    ↓
GOOGLE EARTH ENGINE
    ↓
BIGQUERY FEATURE STORE
    ↓
VERTEX AI PREDICTIVE MODEL
    ↓
DETERMINISTIC RISK ENGINE
    ↓
SIMULATION RESULTS
    ↓
         GEMINI
    ↓
ACTION PLAN
    ↓
COMMAND CENTER UI`}
                </pre>
                
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', marginTop: '24px' }}>Data Sources</h3>
                <ul style={{ paddingLeft: '20px', marginBottom: '24px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Risk Engine (Deterministic):</strong> Calculates core Hazard, Exposure, and Vulnerability. This is the single source of truth for risk metrics.
                    <br/> <span style={{ color: 'var(--text-secondary)' }}><em>Risk Score = Hazard × Exposure × Vulnerability × Category Multiplier</em></span>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>BigQuery (Feature Store):</strong> Historical cyclone impact and infrastructure features for predictive model training.
                    <br/><span className={`status-dot ${dataSourceStatus.bigquery === 'CONNECTED' ? 'bg-low' : 'bg-medium'}`} style={{display: 'inline-block', marginRight: '4px'}}></span> Current Status: {dataSourceStatus.bigquery}
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Google Earth Engine (Context):</strong> Provides real-world geospatial intelligence (NASADEM Elevation, JRC Coastal Exposure) to enhance deterministic calculations.
                    <br/><span className={`status-dot ${dataSourceStatus.earthEngine === 'connected' ? 'bg-low' : 'bg-medium'}`} style={{display: 'inline-block', marginRight: '4px'}}></span> Current Status: {dataSourceStatus.earthEngine.toUpperCase()}
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Google Gemini (Reasoning):</strong> Translates deterministic simulation results into operational intelligence and tactical action plans. Does not invent or modify risk scores.
                    <br/><span className={`status-dot ${dataSourceStatus.gemini === 'connected' ? 'bg-low' : 'bg-medium'}`} style={{display: 'inline-block', marginRight: '4px'}}></span> Current Status: {dataSourceStatus.gemini.toUpperCase()}
                  </li>
                </ul>

                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', marginTop: '24px' }}>Demo Fallback</h3>
                <p>
                  To ensure 100% demonstration reliability, the system features a robust fallback mechanism. If Gemini APIs rate limit or Earth Engine is unauthenticated, the system cleanly drops into a cached/deterministic mode without crashing.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
