import { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  SlidersHorizontal,
  Activity,
  Map as MapIcon,
  Database,
  Play,
  Layers,
  AlertTriangle,
  Users,
  Wind,
  Droplets,
  Target,
  Crosshair,
  ArrowRight,
  ArrowDown,
  Globe,
  Calculator,
  FileText,
  Brain,
  Monitor
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

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  /*
   * Application entry state.
   *
   * landing  -> public product page
   * login    -> sign-in UI
   * register -> account creation UI
   * dashboard -> existing CycloneShield application
   */
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync view state with auth
  useEffect(() => {
    if (!authInitialized) return;
    if (user && (view === 'login' || view === 'register' || view === 'landing')) {
      setView('dashboard');
    } else if (!user && view === 'dashboard') {
      setView('landing');
    }
  }, [user, view, authInitialized]);

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
  const [hasSimulated, setHasSimulated] = useState(false);
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

      setDataSourceStatus(prev => ({
        ...prev,
        earthEngine: result.status
      }));
    }

    loadGeoContext();

    async function loadDataStatus() {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE_URL}/api/data-status`);
        const data = await res.json();

        setDataSourceStatus(prev => ({
          ...prev,
          bigquery: data.bigquery.status.toUpperCase(),
          vertexAI: data.vertexAI.status.toUpperCase()
        }));
      } catch (e) {
        console.error('Failed to fetch data status', e);
      }
    }

    loadDataStatus();
  }, []);

  // Derive risk results
  const results = useMemo(() => {
    return INFRASTRUCTURE_ASSETS.map(asset =>
      calculateRisk(scenario, asset, geoContext)
    );
  }, [scenario, geoContext]);

  const criticalAssets = results.filter(
    result => result.category === 'CRITICAL'
  ).length;

  const highRiskAssets = results.filter(
    result => result.category === 'HIGH'
  ).length;

  useEffect(() => {
    let isActive = true;

    async function fetchPredictions() {
      const targets = results
        .filter(
          result =>
            result.category === 'CRITICAL' ||
            result.category === 'HIGH'
        )
        .slice(0, 5);

      const newImpacts = {};
      let anyConnected = false;
      let anyInvalid = false;

      const promises = targets.map(async asset => {
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
        return { asset, res };
      });

      const resolved = await Promise.all(promises);

      if (!isActive) return;

      for (const { asset, res } of resolved) {
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

    return () => {
      isActive = false;
    };
  }, [scenario, results, isSimulating, geoContext]);

  // Only count population if hazard > 0.2
  const popExposed = results.reduce(
    (acc, result) =>
      result.hazard > 0.2
        ? acc + result.populationServed
        : acc,
    0
  );

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
      setHasSimulated(true);
    }, 400);
  };

  const applyPreset = preset => {
    if (preset === 'MODERATE') {
      setDraftWindSpeed(100);
      setDraftRadius(80);
      setDraftRainfall(100);
      setDraftTrackShift(25);
    } else if (preset === 'SEVERE') {
      setDraftWindSpeed(180);
      setDraftRadius(150);
      setDraftRainfall(300);
      setDraftTrackShift(0);
    } else if (preset === 'EXTREME') {
      setDraftWindSpeed(280);
      setDraftRadius(250);
      setDraftRainfall(600);
      setDraftTrackShift(-20);
    }
  };

  const selectedAsset = results.find(
    result => result.id === selectedAssetId
  );


  /*
   * Public application flow.
   *
   * Keep these views outside the dashboard tree so the existing
   * dashboard remains untouched and does not mount unnecessarily
   * while the user is on the landing/auth screens.
   */
  if (view === 'landing') {
    return (
      <Landing
        onLaunch={() => setView(user ? 'dashboard' : 'login')}
        onSignIn={() => setView('login')}
      />
    );
  }

  if (view === 'login') {
    return (
      <Login
        onBack={() => setView('landing')}
        onRegister={() => setView('register')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }

  if (view === 'register') {
    return (
      <Register
        onBack={() => setView('landing')}
        onLogin={() => setView('login')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }


  
  const isScenarioDirty = 
    scenario.windSpeed !== draftWindSpeed ||
    scenario.radius !== draftRadius ||
    scenario.rainfall !== draftRainfall ||
    scenario.trackShift !== draftTrackShift;

  let simulationStatusMsg = 'Ready to simulate this scenario.';
  let simulationStatusColor = 'text-[var(--text-secondary)]';
  
  let headerBadgeText = 'READY TO SIMULATE';
  let headerDotClass = 'bg-gray-400 dark:bg-gray-500';

  if (isSimulating) {
    simulationStatusMsg = 'Running impact simulation...';
    simulationStatusColor = 'text-blue-500 dark:text-blue-400';
    headerBadgeText = 'SIMULATION RUNNING';
    headerDotClass = 'bg-blue-500 animate-pulse';
  } else if (hasSimulated && isScenarioDirty) {
    simulationStatusMsg = 'Scenario changed — run impact simulation to update results.';
    simulationStatusColor = 'text-amber-500 dark:text-amber-400';
    headerBadgeText = 'SCENARIO CHANGED';
    headerDotClass = 'bg-amber-500';
  } else if (hasSimulated && !isScenarioDirty) {
    simulationStatusMsg = 'Simulation complete';
    simulationStatusColor = 'text-green-500 dark:text-green-400';
    headerBadgeText = 'SIMULATION COMPLETE';
    headerDotClass = 'active';
  } else if (!hasSimulated && isScenarioDirty) {
    simulationStatusMsg = 'Scenario changed — run impact simulation to update results.';
    simulationStatusColor = 'text-amber-500 dark:text-amber-400';
    headerBadgeText = 'SCENARIO CHANGED';
    headerDotClass = 'bg-amber-500';
  }

  if (!user && view === 'dashboard') {
    return null;
  }

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <ShieldAlert
              size={20}
              color="var(--primary)"
            />
            CYCLONESHIELD
          </div>

          <div className="brand-subtitle">
            CYCLONE INTELLIGENCE
          </div>
        </div>

        <nav className="nav-menu">
          {[
            {
              id: 'COMMAND CENTER',
              icon: LayoutDashboard
            },
            {
              id: 'SCENARIO SIMULATOR',
              icon: SlidersHorizontal
            },
            {
              id: 'INFRASTRUCTURE RISK',
              icon: Activity
            },
            {
              id: 'ACTION PLAN',
              icon: MapIcon
            },
            {
              id: 'DATA & METHOD',
              icon: Database
            }
          ].map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''
                }`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={18} />
              {item.id}
            </div>
          ))}
        </nav>

        <div className="system-status">
          <div className="status-label">
            DATA PROVENANCE
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.earthEngine === 'connected'
                  ? 'bg-low'
                  : 'bg-medium'
                }`}
            />
            Earth Engine (
            {dataSourceStatus.earthEngine.toUpperCase()}
            )
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.gemini === 'connected'
                  ? 'bg-low'
                  : 'bg-medium'
                }`}
            />
            Gemini AI (API / FALLBACK)
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.bigquery === 'CONNECTED'
                  ? 'bg-low'
                  : 'bg-medium'
                }`}
            />
            BigQuery ({dataSourceStatus.bigquery})
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.vertexAI === 'CONNECTED'
                  ? 'bg-low'
                  : 'bg-medium'
                }`}
            />
            Vertex AI ({dataSourceStatus.vertexAI})
          </div>

          <div className="status-item">
            <div className="status-dot bg-low" />
            Risk Engine (DETERMINISTIC)
          </div>

          <div className="status-item">
            <div className="status-dot bg-medium" />
            Infrastructure (
            {dataSourceStatus.infrastructure.toUpperCase()}
            )
          </div>

          <button
            onClick={async () => {
              await signOut(auth);
              setView('landing');
            }}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            SIGN OUT
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <main className="main-content">

        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab}
            </h1>

            <div className="page-subtitle">
              Cyclone impact overview and infrastructure exposure.
            </div>
          </div>

          <div className="header-right">
            <div className={`badge ${isSimulating ? 'badge-active' : 'badge-outline'}`}>
              <span className={`status-dot ${headerDotClass}`} />
              {headerBadgeText}
            </div>

            <div className="badge badge-outline">
              ODISHA COAST
            </div>

            <div
              className="badge badge-outline"
              style={{
                color: 'var(--text-secondary)'
              }}
            >
              {new Date()
                .toISOString()
                .substring(11, 16)}{' '}
              UTC
            </div>
            
            <button
              className="badge badge-outline"
              style={{
                cursor: 'pointer'
              }}
              onClick={() => applyPreset('MODERATE')}
              title="Reset to default moderate scenario"
            >
              RESET SCENARIO
            </button>
          </div>
        </header>


        {/* Scrollable Content */}
        <div className="content-scrollable">


          {/* COMMAND CENTER */}
          {activeTab === 'COMMAND CENTER' && (
            <>
              {/* KPI Row */}
              <div className="kpi-grid">

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">
                      CRITICAL ASSETS
                    </span>

                    <AlertTriangle
                      size={16}
                      className="color-critical"
                    />
                  </div>

                  <div className="kpi-value">
                    {criticalAssets
                      .toString()
                      .padStart(2, '0')}
                  </div>

                  <div className="kpi-footer">
                    Exceeding safe vulnerability threshold
                  </div>
                </div>


                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">
                      HIGH RISK ASSETS
                    </span>

                    <Activity
                      size={16}
                      className="color-high"
                    />
                  </div>

                  <div className="kpi-value">
                    {highRiskAssets
                      .toString()
                      .padStart(2, '0')}
                  </div>

                  <div className="kpi-footer">
                    Requires immediate observation
                  </div>
                </div>


                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">
                      POPULATION EXPOSED
                    </span>

                    <Users
                      size={16}
                      className="color-primary"
                    />
                  </div>

                  <div className="kpi-value">
                    {(popExposed / 1000000).toFixed(2)}M
                  </div>

                  <div className="kpi-footer">
                    Within active hazard zone
                  </div>
                </div>


                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">
                      INFRASTRUCTURE AT RISK
                    </span>

                    <Activity
                      size={16}
                      className="color-medium"
                    />
                  </div>

                  <div className="kpi-value">
                    {results.length
                      .toString()
                      .padStart(2, '0')}
                  </div>

                  <div className="kpi-footer">
                    Monitored regional assets
                  </div>
                </div>

              </div>


              {/* Main Dashboard Grid */}
              <div className="dashboard-grid">

                {/* Left Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}
                >

                  {/* GIS Map Panel */}
                  <div className="panel">

                    <div className="panel-header">
                      <div className="panel-title">
                        <MapIcon
                          size={16}
                          color="var(--text-secondary)"
                        />
                        GEOSPATIAL HAZARD PROJECTION
                      </div>
                    </div>


                    <div
                      className="map-container"
                      style={{
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >

                      {/* Simulated Track */}
                      <div
                        style={{
                          left: `${50 + scenario.trackShift}%`,
                          width: '2px',
                          background:
                            'rgba(255,255,255,0.1)',
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          transform:
                            'translateX(-50%)',
                          borderLeft:
                            '1px dashed rgba(255,255,255,0.3)'
                        }}
                      />


                      {/* Hazard Radius */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${50 + scenario.trackShift}%`,
                          bottom: '10%',
                          transform:
                            'translate(-50%, 50%)'
                        }}
                      >
                        <div
                          style={{
                            width: `${scenario.radius}px`,
                            height: `${scenario.radius}px`,
                            background:
                              'radial-gradient(circle, rgba(220,38,38,0.2) 0%, rgba(220,38,38,0) 70%)',
                            borderRadius: '50%',
                            zIndex: 1
                          }}
                        />
                      </div>


                      {/* Coastal Exposure Layer */}
                      {showCoastalLayer && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '40%',
                            background:
                              'linear-gradient(to top, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 100%)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}


                      {/* Elevation Layer */}
                      {showElevationLayer && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: '100%',
                            background:
                              'radial-gradient(circle at 50% 10%, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0) 60%)',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      )}


                      <div
                        style={{
                          position: 'absolute',
                          bottom: '5px',
                          left: `${50 + scenario.trackShift + 2}%`,
                          fontSize: '10px',
                          color: 'rgba(255,255,255,0.5)'
                        }}
                      >
                        SIMULATED TRACK
                      </div>


                      {/* Asset Markers */}
                      {results.map(result => (
                        <div
                          key={result.id}
                          className={`map-marker bg-${result.category.toLowerCase()} ${selectedAssetId === result.id
                              ? 'selected-marker'
                              : ''
                            }`}
                          style={{
                            top: `${result.y}%`,
                            left: `${result.x}%`,
                            cursor: 'pointer',
                            transform:
                              'translate(-50%, -50%)',
                            boxShadow:
                              selectedAssetId === result.id
                                ? '0 0 0 4px rgba(255,255,255,0.3)'
                                : 'none'
                          }}
                          onClick={() =>
                            setSelectedAssetId(result.id)
                          }
                          title={result.name}
                        />
                      ))}


                      {/* Map Controls */}
                      <div className="map-controls">

                        <button
                          className="map-btn"
                          title="Toggle Coastal Exposure"
                          onClick={() =>
                            setShowCoastalLayer(
                              value => !value
                            )
                          }
                        >
                          <Droplets
                            size={16}
                            color={
                              showCoastalLayer
                                ? 'var(--primary)'
                                : 'inherit'
                            }
                          />
                        </button>


                        <button
                          className="map-btn"
                          title="Toggle Elevation"
                          onClick={() =>
                            setShowElevationLayer(
                              value => !value
                            )
                          }
                        >
                          <Layers
                            size={16}
                            color={
                              showElevationLayer
                                ? 'var(--primary)'
                                : 'inherit'
                            }
                          />
                        </button>

                      </div>


                      {/* Map Legend */}
                      <div className="map-legend">
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: '8px'
                          }}
                        >
                          RISK ZONES
                        </div>

                        <div className="legend-item">
                          <div className="legend-color bg-critical" />
                          Critical
                        </div>

                        <div className="legend-item">
                          <div className="legend-color bg-high" />
                          High
                        </div>

                        <div className="legend-item">
                          <div className="legend-color bg-medium" />
                          Medium
                        </div>

                        <div className="legend-item">
                          <div className="legend-color bg-low" />
                          Low
                        </div>
                      </div>

                    </div>
                  </div>
                </div>


                {/* Right Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}
                >

                  <AIBriefing
                    scenario={scenario}
                    results={results}
                    predictiveImpacts={predictiveImpacts}
                  />

                  <MultimodalAnalysis
                    scenario={scenario}
                    riskSummary={{
                      criticalAssetsCount:
                        criticalAssets,
                      highRiskAssetsCount:
                        highRiskAssets,
                      popExposed,
                      totalRiskSum:
                        results.reduce(
                          (acc, curr) =>
                            acc + curr.risk,
                          0
                        )
                    }}
                    criticalAssets={results
                      .filter(
                        result =>
                          result.category ===
                          'CRITICAL'
                      )
                      .map(result => result.name)}
                    highRiskAssets={results
                      .filter(
                        result =>
                          result.category === 'HIGH'
                      )
                      .map(result => result.name)}
                    geoContext={geoContext}
                  />

                </div>
              </div>
            </>
          )}


          {/* INFRASTRUCTURE RISK */}
          {activeTab === 'INFRASTRUCTURE RISK' && (
            <div className="dashboard-grid">

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}
              >

                <div className="panel">

                  <div className="panel-header">
                    <div className="panel-title">
                      <Database
                        size={16}
                        color="var(--text-secondary)"
                      />
                      ASSET EXPOSURE DOSSIER
                    </div>
                  </div>


                  <div
                    style={{
                      padding: '0',
                      maxHeight:
                        'calc(100vh - 200px)',
                      overflowY: 'auto'
                    }}
                  >

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
                        {results.map(result => (
                          <tr
                            key={result.id}
                            style={{
                              cursor: 'pointer',
                              background:
                                selectedAssetId ===
                                  result.id
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'transparent'
                            }}
                            onClick={() =>
                              setSelectedAssetId(
                                result.id
                              )
                            }
                          >
                            <td
                              style={{
                                fontWeight: 500
                              }}
                            >
                              {result.name}
                            </td>

                            <td
                              style={{
                                color:
                                  'var(--text-secondary)'
                              }}
                            >
                              {result.type.replace(
                                '_',
                                ' '
                              )}
                            </td>

                            <td
                              style={{
                                color:
                                  'var(--text-secondary)'
                              }}
                            >
                              {result.location}
                            </td>

                            <td
                              style={{
                                fontWeight: 600
                              }}
                            >
                              {result.risk}/100
                            </td>

                            <td>
                              <span
                                className={`risk-badge badge-${result.category.toLowerCase()}`}
                              >
                                {result.category}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>
                </div>
              </div>


              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}
              >

                {/* Asset Detail */}
                {selectedAsset && (
                  <div className="panel border border-[var(--border)]">
                    <div className="panel-header">
                      <div className="panel-title">
                        <Crosshair size={16} color="var(--text-secondary)" />
                        ASSET DOSSIER
                      </div>
                      <button
                        className="badge badge-outline"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedAssetId(null)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="panel-body">
                      {/* Dossier Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                            {selectedAsset.name}
                          </h3>
                          <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                            {selectedAsset.type.replace('_', ' ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold color-${selectedAsset.category.toLowerCase()} leading-none mb-2`}>
                            {selectedAsset.risk} <span className="text-sm text-[var(--text-secondary)]">/ 100</span>
                          </div>
                          <span className={`risk-badge badge-${selectedAsset.category.toLowerCase()}`}>
                            {selectedAsset.category} RISK
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                          <div className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">Population Served</div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{selectedAsset.populationServed.toLocaleString()}</div>
                        </div>
                        <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                          <div className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">Vulnerability</div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{(selectedAsset.baseVulnerability * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                          <div className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">Criticality</div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{selectedAsset.criticality} / 5</div>
                        </div>
                        <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                          <div className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase font-semibold">Access Routes</div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{selectedAsset.accessRoutes}</div>
                        </div>
                      </div>

                      {/* Exposure & Risk Factors */}
                      <div className="mb-6">
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                          Exposure & Risk Factors
                        </div>
                        <div className="flex flex-col gap-2">
                          {geoContext && geoContext[selectedAsset.id] && (
                            <>
                              <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)]">
                                <span className="text-xs font-medium text-[var(--text-primary)]">Coastal Exposure</span>
                                <span className="text-xs font-bold text-[var(--text-secondary)]">
                                  {geoContext[selectedAsset.id].coastalExposure > 0.6 ? 'HIGH' : geoContext[selectedAsset.id].coastalExposure > 0.3 ? 'MEDIUM' : 'LOW'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)]">
                                <span className="text-xs font-medium text-[var(--text-primary)]">Elevation</span>
                                <span className="text-xs font-bold text-[var(--text-secondary)]">
                                  {dataSourceStatus.earthEngine === 'demo' && '~'}{Math.round(geoContext[selectedAsset.id].elevation)}m
                                </span>
                              </div>
                            </>
                          )}
                          {predictiveImpacts[selectedAsset.id] && predictiveImpacts[selectedAsset.id].status === 'connected' ? (
                            <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)]">
                              <span className="text-xs font-medium text-[var(--text-primary)]">Predictive Model Impact</span>
                              <span className="text-xs font-bold text-[var(--text-secondary)]">
                                {(predictiveImpacts[selectedAsset.id].predictions[0] * 100).toFixed(1)}% (Confidence: {predictiveImpacts[selectedAsset.id].confidence}%)
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)] opacity-60">
                              <span className="text-xs font-medium text-[var(--text-primary)]">Predictive Model Impact</span>
                              <span className="text-[10px] uppercase text-[var(--text-secondary)]">Unavailable</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recommended Response */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-secondary)] mb-2 font-bold uppercase tracking-wider">
                          RECOMMENDED RESPONSE
                        </div>
                        <div className="text-sm leading-relaxed text-[var(--text-primary)] font-medium">
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
                  <div className="panel border border-[var(--border)]">
                    <div className="panel-header">
                      <div className="panel-title">
                        <Activity size={16} color="var(--text-secondary)" />
                        INFRASTRUCTURE OVERVIEW
                      </div>
                    </div>
                    <div className="panel-body flex flex-col gap-6">
                      <div className="text-center pb-4 border-b border-[var(--border)]">
                        <div className="text-4xl font-bold text-[var(--text-primary)] mb-1">{results.length}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Monitored Assets</div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center p-2 hover:bg-[var(--bg-app)] rounded transition-colors">
                          <span className="text-sm font-medium text-[var(--text-primary)]">Critical Risk</span>
                          <span className="risk-badge badge-critical px-3 py-1 text-xs">{results.filter(r => r.category === 'CRITICAL').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-[var(--bg-app)] rounded transition-colors">
                          <span className="text-sm font-medium text-[var(--text-primary)]">High Risk</span>
                          <span className="risk-badge badge-high px-3 py-1 text-xs">{results.filter(r => r.category === 'HIGH').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-[var(--bg-app)] rounded transition-colors">
                          <span className="text-sm font-medium text-[var(--text-primary)]">Medium Risk</span>
                          <span className="risk-badge badge-medium px-3 py-1 text-xs">{results.filter(r => r.category === 'MEDIUM').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-[var(--bg-app)] rounded transition-colors">
                          <span className="text-sm font-medium text-[var(--text-primary)]">Low Risk</span>
                          <span className="risk-badge badge-low px-3 py-1 text-xs">{results.filter(r => r.category === 'LOW').length}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Total Population Exposed (Hazard &gt; 0.2)</div>
                        <div className="text-xl font-bold text-[var(--text-primary)]">{popExposed.toLocaleString()}</div>
                      </div>

                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 text-center">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Select an asset from the dossier to inspect detailed exposure.</span>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </div>
          )}


          {/* SCENARIO SIMULATOR */}
          {activeTab === 'SCENARIO SIMULATOR' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(600px, 800px)', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">
                      <SlidersHorizontal size={16} color="var(--text-secondary)" />
                      SCENARIO PARAMETERS
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="badge badge-outline" style={{ cursor: 'pointer' }} onClick={() => applyPreset('MODERATE')}>MODERATE</button>
                      <button className="badge badge-outline" style={{ cursor: 'pointer' }} onClick={() => applyPreset('SEVERE')}>SEVERE</button>
                      <button className="badge badge-outline" style={{ cursor: 'pointer' }} onClick={() => applyPreset('EXTREME')}>EXTREME</button>
                    </div>
                  </div>

                  <div className="panel-body">
                    {/* Cyclone Intensity */}
                    <div className="control-group">
                      <div className="control-label">
                        <span><Wind size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />CYCLONE INTENSITY</span>
                        <span className="color-high">{draftWindSpeed} km/h</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track" />
                        <div className="slider-fill" style={{ width: `${(draftWindSpeed - 50) / 3}%` }} />
                        <input type="range" min="50" max="350" value={draftWindSpeed} onChange={event => setDraftWindSpeed(Number(event.target.value))} />
                      </div>
                    </div>

                    {/* Rainfall */}
                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Droplets size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />RAINFALL</span>
                        <span className="color-primary">{draftRainfall} mm</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track" />
                        <div className="slider-fill" style={{ width: `${draftRainfall / 10}%` }} />
                        <input type="range" min="0" max="1000" step="10" value={draftRainfall} onChange={event => setDraftRainfall(Number(event.target.value))} />
                      </div>
                    </div>

                    {/* Track Shift */}
                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Crosshair size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />TRACK SHIFT</span>
                        <span className="color-medium">{draftTrackShift > 0 ? `+${draftTrackShift}` : draftTrackShift} km</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track" />
                        <div className="slider-fill" style={{ width: `${draftTrackShift + 50}%`, background: 'var(--text-secondary)' }} />
                        <input type="range" min="-50" max="50" step="1" value={draftTrackShift} onChange={event => setDraftTrackShift(Number(event.target.value))} />
                      </div>
                    </div>

                    {/* Hazard Radius */}
                    <div className="control-group" style={{ marginTop: '24px' }}>
                      <div className="control-label">
                        <span><Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />HAZARD RADIUS</span>
                        <span className="color-primary">{draftRadius} km</span>
                      </div>
                      <div className="slider-container">
                        <div className="slider-track" />
                        <div className="slider-fill" style={{ width: `${(draftRadius - 50) / 4.5}%` }} />
                        <input type="range" min="50" max="500" step="10" value={draftRadius} onChange={event => setDraftRadius(Number(event.target.value))} />
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

                {/* Simulation Result */}
                <div className="panel border border-[var(--border)]">
                   <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
                     <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                       <Activity size={14} color="var(--text-secondary)" />
                       SIMULATION RESULT
                     </div>
                     <div className={`text-[10px] font-bold uppercase tracking-wider ${simulationStatusColor}`}>
                       {simulationStatusMsg}
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-4 gap-3">
                      <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">Critical Assets</div>
                        <div className="text-2xl font-bold color-critical leading-none">{criticalAssets}</div>
                      </div>
                      <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">High Risk</div>
                        <div className="text-2xl font-bold color-high leading-none">{highRiskAssets}</div>
                      </div>
                      <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">At Risk (Total)</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)] leading-none">{criticalAssets + highRiskAssets}</div>
                      </div>
                      <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)] text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-2">Pop. Exposed</div>
                        <div className="text-2xl font-bold color-primary leading-none">{(popExposed / 1000000).toFixed(2)}M</div>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          )}


          {/* ACTION PLAN */}
          {activeTab === 'ACTION PLAN' && (
            <div
              className="dashboard-grid"
              style={{
                gridTemplateColumns: '1fr'
              }}
            >

              <AIBriefing
                scenario={scenario}
                results={results}
                predictiveImpacts={predictiveImpacts}
                fullView={true}
              />

              <MultimodalAnalysis
                scenario={scenario}
                riskSummary={{
                  criticalAssetsCount:
                    criticalAssets,
                  highRiskAssetsCount:
                    highRiskAssets,
                  popExposed,
                  totalRiskSum:
                    results.reduce(
                      (acc, curr) =>
                        acc + curr.risk,
                      0
                    )
                }}
                criticalAssets={results
                  .filter(
                    result =>
                      result.category ===
                      'CRITICAL'
                  )
                  .map(result => result.name)}
                highRiskAssets={results
                  .filter(
                    result =>
                      result.category === 'HIGH'
                  )
                  .map(result => result.name)}
                geoContext={geoContext}
              />

            </div>
          )}


          {/* DATA & METHOD */}
          {activeTab === 'DATA & METHOD' && (
            <div className="panel">

              <div className="panel-header">
                <div className="panel-title">
                  ARCHITECTURE & DATA PROVENANCE
                </div>
              </div>


              <div
                className="panel-body"
                style={{
                  color:
                    'var(--text-secondary)',
                  lineHeight: '1.6'
                }}
              >

                <h3
                  style={{
                    color:
                      'var(--text-primary)',
                    marginBottom: '12px'
                  }}
                >
                  System Architecture
                </h3>


                <div className="flex flex-col xl:flex-row items-center xl:items-stretch gap-4 mb-8">
                  {[
                    { id: 'ee', title: 'Earth Engine', role: 'Geospatial context', icon: Globe, status: dataSourceStatus.earthEngine.toUpperCase() },
                    { id: 'bq', title: 'BigQuery', role: 'Feature layer', icon: Database, status: dataSourceStatus.bigquery },
                    { id: 'vertex', title: 'Vertex AI', role: 'Predictive layer', icon: Activity, status: dataSourceStatus.vertexAI },
                    { id: 'risk', title: 'Risk Engine', role: 'Authoritative calculation', icon: Calculator, prominent: true },
                    { id: 'sim', title: 'Simulation Results', role: 'Validated outputs', icon: Target },
                    { id: 'gemini', title: 'Gemini Reasoning', role: 'Interprets results', icon: Brain, status: dataSourceStatus.gemini === 'connected' ? 'CONNECTED' : 'FALLBACK' },
                    { id: 'plan', title: 'Action Plan', role: 'Actionable insights', icon: FileText },
                    { id: 'ui', title: 'Command Center', role: 'Operational view', icon: LayoutDashboard }
                  ].map((node, index, arr) => (
                    <div key={node.id} className="flex flex-col xl:flex-row items-center gap-4 flex-1">
                      <div
                        className={`flex flex-col items-center justify-center p-4 text-center rounded-lg border w-full h-full min-h-[140px] ${
                          node.prominent
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                            : 'border-[var(--border)] bg-[var(--bg-panel)]'
                        }`}
                      >
                        <node.icon
                          size={24}
                          className={node.prominent ? 'text-blue-600 mb-2' : 'text-slate-500 mb-2'}
                        />
                        <div className="font-semibold text-[13px] text-[var(--text-primary)] mb-1 leading-tight">
                          {node.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] leading-tight mb-2">
                          {node.role}
                        </div>
                        {node.status && (
                          <div
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-auto ${
                              node.status === 'CONNECTED'
                                ? 'bg-green-100 text-green-700'
                                : node.status === 'UNAVAILABLE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {node.status}
                          </div>
                        )}
                      </div>
                      
                      {/* Arrow */}
                      {index < arr.length - 1 && (
                        <>
                          <ArrowRight className="hidden xl:block text-slate-300 shrink-0" size={20} />
                          <ArrowDown className="block xl:hidden text-slate-300 shrink-0" size={20} />
                        </>
                      )}
                    </div>
                  ))}
                </div>


                <h3
                  style={{
                    color:
                      'var(--text-primary)',
                    marginBottom: '12px',
                    marginTop: '24px'
                  }}
                >
                  Data Sources
                </h3>


                <ul
                  style={{
                    paddingLeft: '20px',
                    marginBottom: '24px'
                  }}
                >

                  <li
                    style={{
                      marginBottom: '8px'
                    }}
                  >
                    <strong
                      style={{
                        color:
                          'var(--text-primary)'
                      }}
                    >
                      Risk Engine (Deterministic):
                    </strong>{' '}
                    Calculates core Hazard,
                    Exposure, and Vulnerability.
                    This is the single source of
                    truth for risk metrics.

                    <br />

                    <span
                      style={{
                        color:
                          'var(--text-secondary)'
                      }}
                    >
                      <em>
                        Risk Score = Hazard ×
                        Exposure × Vulnerability ×
                        Category Multiplier
                      </em>
                    </span>
                  </li>


                  <li
                    style={{
                      marginBottom: '8px'
                    }}
                  >
                    <strong
                      style={{
                        color:
                          'var(--text-primary)'
                      }}
                    >
                      BigQuery (Feature Store):
                    </strong>{' '}
                    Historical cyclone impact and
                    infrastructure features for
                    predictive model training.

                    <br />

                    <span
                      className={`status-dot ${dataSourceStatus.bigquery ===
                          'CONNECTED'
                          ? 'bg-low'
                          : 'bg-medium'
                        }`}
                      style={{
                        display: 'inline-block',
                        marginRight: '4px'
                      }}
                    />

                    Current Status:{' '}
                    {dataSourceStatus.bigquery}
                  </li>


                  <li
                    style={{
                      marginBottom: '8px'
                    }}
                  >
                    <strong
                      style={{
                        color:
                          'var(--text-primary)'
                      }}
                    >
                      Google Earth Engine (Context):
                    </strong>{' '}
                    Provides real-world
                    geospatial intelligence
                    (NASADEM Elevation, JRC Coastal
                    Exposure) to enhance
                    deterministic calculations.

                    <br />

                    <span
                      className={`status-dot ${dataSourceStatus.earthEngine ===
                          'connected'
                          ? 'bg-low'
                          : 'bg-medium'
                        }`}
                      style={{
                        display: 'inline-block',
                        marginRight: '4px'
                      }}
                    />

                    Current Status:{' '}
                    {dataSourceStatus.earthEngine.toUpperCase()}
                  </li>


                  <li
                    style={{
                      marginBottom: '8px'
                    }}
                  >
                    <strong
                      style={{
                        color:
                          'var(--text-primary)'
                      }}
                    >
                      Google Gemini (Reasoning):
                    </strong>{' '}
                    Translates deterministic
                    simulation results into
                    operational intelligence and
                    tactical action plans. Does not
                    invent or modify risk scores.

                    <br />

                    <span
                      className={`status-dot ${dataSourceStatus.gemini ===
                          'connected'
                          ? 'bg-low'
                          : 'bg-medium'
                        }`}
                      style={{
                        display: 'inline-block',
                        marginRight: '4px'
                      }}
                    />

                    Current Status:{' '}
                    {dataSourceStatus.gemini.toUpperCase()}
                  </li>

                </ul>


                <h3
                  style={{
                    color:
                      'var(--text-primary)',
                    marginBottom: '12px',
                    marginTop: '24px'
                  }}
                >
                  Demo Fallback
                </h3>

                <p>
                  To ensure 100% demonstration
                  reliability, the system features a
                  robust fallback mechanism. If
                  Gemini APIs rate limit or Earth
                  Engine is unauthenticated, the
                  system cleanly drops into a
                  cached/deterministic mode without
                  crashing.
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