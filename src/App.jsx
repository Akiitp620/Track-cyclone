import { useState, useMemo, useEffect, Fragment } from 'react';
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
  ArrowLeft,
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
import { InteractiveMap } from './components/InteractiveMap';
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
  const [satelliteEvidence, setSatelliteEvidence] = useState(null);
  const [showCoastalLayer, setShowCoastalLayer] = useState(false);
  const [showElevationLayer, setShowElevationLayer] = useState(false);

  const [dataSourceStatus, setDataSourceStatus] = useState({
    earthEngine: 'loading',
    gemini: 'loading',
    infrastructure: 'demo',
    meteorologicalData: 'scenario',
    vertexAI: 'UNAVAILABLE',
    bigquery: 'UNAVAILABLE'
  });

  const [predictiveImpacts, setPredictiveImpacts] = useState({});

  const [assets, setAssets] = useState(INFRASTRUCTURE_ASSETS);
  const [assetSource, setAssetSource] = useState('demo');
  const [assetCount, setAssetCount] = useState(INFRASTRUCTURE_ASSETS.length); useEffect(() => {
    async function loadData() {
      let currentAssets = INFRASTRUCTURE_ASSETS;
      let bqConnected = false;
      let bqCount = 0;

      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const resAssets = await fetch(`${API_BASE_URL}/api/infrastructure-assets`);
        const assetsData = await resAssets.json();

        if (assetsData.status === 'connected' && assetsData.assets && assetsData.assets.length > 0) {
          currentAssets = assetsData.assets;
          bqCount = assetsData.count;
          bqConnected = true;
        }
      } catch (e) {
        console.error('Failed to fetch infrastructure assets', e);
      }

      setAssets(currentAssets);
      setAssetSource(bqConnected ? 'bigquery' : 'demo');
      setAssetCount(bqConnected ? bqCount : currentAssets.length);

      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const resStatus = await fetch(`${API_BASE_URL}/api/data-status`);
        const statusData = await resStatus.json();

        setDataSourceStatus(prev => ({
          ...prev,
          bigquery: statusData.bigquery.status.toUpperCase(),
          vertexAI: statusData.vertexAI.status.toUpperCase(),
          gemini: statusData.gemini.status.toUpperCase(),
          infrastructure: bqConnected ? 'bigquery-backed infrastructure assets' : 'demo'
        }));
      } catch (e) {
        console.error('Failed to fetch data status', e);
      }

      const result = await fetchGeospatialContext(currentAssets);
      setGeoContext(result.data);
      setDataSourceStatus(prev => ({
        ...prev,
        earthEngine: result.status
      }));
    }

    loadData();
  }, []);

  // Derive risk results
  const results = useMemo(() => {
    return assets.map(asset =>
      calculateRisk(scenario, asset, geoContext)
    );
  }, [scenario, geoContext, assets]);

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
          vulnerability: asset.baseVulnerability || 0,
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

  const handleSimulate = async () => {
    setIsSimulating(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const satResponse = await fetch(`${API_BASE_URL}/api/satellite-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets })
      });
      const satData = await satResponse.json();
      setSatelliteEvidence(satData);
    } catch (err) {
      console.error("Satellite evidence fetch error:", err);
    }

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
              className={`status-dot ${dataSourceStatus.gemini === 'CONNECTED'
                ? 'bg-low'
                : 'bg-medium'
                }`}
            />
            Gemini AI ({dataSourceStatus.gemini === 'CONNECTED' ? 'CONNECTED' : (dataSourceStatus.gemini === 'CONFIGURED' ? 'STANDBY' : (dataSourceStatus.gemini === 'NOT_CONFIGURED' ? 'NOT CONFIGURED' : 'UNAVAILABLE / FALLBACK'))})
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.bigquery === 'CONNECTED'
                ? 'bg-low'
                : 'bg-medium'
                }`}
            />
            BigQuery ({dataSourceStatus.bigquery}{assetSource === 'bigquery' ? ` - ${assetCount} assets` : ''})
          </div>

          <div className="status-item">
            <div
              className={`status-dot ${dataSourceStatus.vertexAI === 'CONNECTED'
                ? 'bg-low'
                : 'bg-medium'
                }`}
            />
            Vertex AI ({dataSourceStatus.vertexAI === 'CONNECTED' ? 'CONNECTED' : (dataSourceStatus.vertexAI === 'CONFIGURED' ? 'STANDBY' : 'UNAVAILABLE')})
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
                    gap: '24px',
                    height: '100%'
                  }}
                >

                  {/* GIS Map Panel */}
                  <div className="panel" style={{ height: '100%' }}>

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
                        overflow: 'hidden',
                        height: '100%',
                        flex: 1
                      }}
                    >
                      <InteractiveMap
                        scenario={scenario}
                        results={results}
                        selectedAssetId={selectedAssetId}
                        setSelectedAssetId={setSelectedAssetId}
                        showCoastalLayer={showCoastalLayer}
                        showElevationLayer={showElevationLayer}
                      />
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
                    onGeminiStatus={(status) => setDataSourceStatus(prev => ({ ...prev, gemini: status }))}
                  />

                </div>
              </div>

              {/* Full Width Bottom Section */}
              <div style={{ marginTop: '24px' }}>
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
                                  {geoContext[selectedAsset.id].elevationAvailable === false
                                    ? '—'
                                    : <>{dataSourceStatus.earthEngine === 'demo' && '~'}{Math.round(geoContext[selectedAsset.id].elevation)}m</>}
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
            <div className="dashboard-grid" style={{ gridTemplateColumns: '400px 1fr', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 1 }}>
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

                  <div className="panel-body" style={{ overflowY: 'auto', paddingBottom: '12px' }}>
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
                  </div>
                  <div style={{ padding: '0 20px 20px 20px', flexShrink: 0 }}>
                    <button
                      className={`btn btn-full ${isScenarioDirty ? 'btn-primary animate-pulse' : 'btn-primary'}`}
                      style={{ padding: '16px', opacity: (!isScenarioDirty && hasSimulated) ? 0.7 : 1 }}
                      onClick={handleSimulate}
                      disabled={isSimulating || (!isScenarioDirty && hasSimulated)}
                    >
                      <Play size={16} />
                      {isSimulating ? 'RUNNING...' : (isScenarioDirty ? 'UPDATE SIMULATION (CHANGED)' : (hasSimulated ? 'SIMULATION COMPLETE' : 'RUN IMPACT SIMULATION'))}
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

                {/* Satellite Evidence Panel */}
                {satelliteEvidence && (
                  <div className="panel border border-[var(--border)] mt-4">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border)]">
                      <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Globe size={14} color="var(--text-secondary)" />
                        SATELLITE EVIDENCE (SENTINEL-1)
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${satelliteEvidence.status === 'connected' ? 'text-green-500' : 'text-slate-500'}`}>
                        {satelliteEvidence.status === 'connected' ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </div>
                    </div>

                    {satelliteEvidence.status === 'connected' ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Scenes Found</div>
                            <div className="text-lg font-bold text-[var(--text-primary)] leading-none">{satelliteEvidence.scenesAvailable}</div>
                          </div>
                          <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border)]">
                            <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">Median Backscatter</div>
                            <div className="text-lg font-bold text-[var(--text-primary)] leading-none">
                              {satelliteEvidence.metrics?.medianBackscatterDb != null ? `${satelliteEvidence.metrics.medianBackscatterDb.toFixed(2)} dB` : '—'}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)]">
                          <span className="text-xs font-medium text-[var(--text-primary)]">Analysis Period</span>
                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">{satelliteEvidence.analysisPeriod}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-[var(--bg-app)] rounded border border-[var(--border)]">
                          <span className="text-xs font-medium text-[var(--text-primary)]">Temporal Comparison</span>
                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                            {satelliteEvidence.comparisonAvailable ? 'AVAILABLE (≥2 SCENES)' : 'UNAVAILABLE'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--text-secondary)] p-3 bg-[var(--bg-app)] rounded border border-[var(--border)] text-center">
                        {satelliteEvidence.reason || 'Evidence currently unavailable.'}
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div className="panel" style={{ height: '100%' }}>
                <div className="panel-header">
                  <div className="panel-title">
                    <MapIcon size={16} color="var(--text-secondary)" />
                    SIMULATED HAZARD PROJECTION
                  </div>
                </div>
                <div
                  className="map-container"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    flex: 1
                  }}
                >
                  {/* For the simulator, we pass draft scenario to show realtime updates on the map */}
                  <InteractiveMap
                    scenario={{
                      category: 1, // Will be computed by risk engine on run, but track shift/radius can be seen now
                      windSpeed: draftWindSpeed,
                      rainfall: draftRainfall,
                      trackShift: draftTrackShift,
                      radius: draftRadius
                    }}
                    results={results} // Uses currently applied results
                    selectedAssetId={selectedAssetId}
                    setSelectedAssetId={setSelectedAssetId}
                    showCoastalLayer={showCoastalLayer}
                    showElevationLayer={showElevationLayer}
                  />
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
                onGeminiStatus={(status) => setDataSourceStatus(prev => ({ ...prev, gemini: status }))}
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
            <div className="panel" style={{ flex: 1, minHeight: 0 }}>
              <div className="panel-header">
                <div className="panel-title">
                  <Database size={16} color="var(--text-secondary)" />
                  DATA & METHODOLOGY
                </div>
              </div>
              <div className="panel-body" style={{ color: 'var(--text-secondary)', lineHeight: '1.6', overflowY: 'auto', padding: '24px', gap: '32px' }}>

                {/* 1. SYSTEM ARCHITECTURE */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">System Architecture</h3>

                  {/* Desktop Layout: 2 Rows */}
                  <div className="hidden xl:flex flex-col gap-6 relative">
                    {/* ROW 1 */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { id: 'ee', title: 'Earth Engine', role: 'Geospatial context', icon: Globe },
                        { id: 'bq', title: 'BigQuery', role: 'Historical / feature data', icon: Database },
                        { id: 'vertex', title: 'Vertex AI', role: 'Predictive impact layer', icon: Activity },
                        { id: 'risk1', title: 'Risk Engine', role: 'Deterministic calculation', icon: Calculator, prominent: true }
                      ].map((node) => (
                        <div key={node.id} className="relative flex">
                          <div className={`flex flex-col items-center justify-center p-4 text-center rounded-lg border w-full h-[110px] ${node.prominent ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-[var(--border)] bg-[var(--bg-app)]'}`}>
                            <node.icon size={24} className={node.prominent ? 'text-blue-600 mb-2' : 'text-slate-500 mb-2'} />
                            <div className="font-semibold text-[13px] text-[var(--text-primary)] mb-1 leading-tight">{node.title}</div>
                            <div className="text-[11px] text-[var(--text-secondary)] leading-tight">{node.role}</div>
                          </div>
                          {node.id !== 'risk1' && (
                            <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-slate-300 z-10" size={20} />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pr-[12.5%] -my-3 z-0 relative">
                      <ArrowDown className="text-slate-300" size={20} />
                    </div>

                    {/* ROW 2 */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { id: 'ui', title: 'Command Center', role: 'Decision-support interface', icon: LayoutDashboard },
                        { id: 'plan', title: 'Action Plan', role: 'Operational decisions', icon: FileText },
                        { id: 'gemini', title: 'Gemini', role: 'Reasoning + action generation', icon: Brain },
                        { id: 'sim', title: 'Simulation Results', role: 'Validated scenario outputs', icon: Target }
                      ].map((node, index, arr) => (
                        <div key={node.id} className="relative flex">
                          <div className={`flex flex-col items-center justify-center p-4 text-center rounded-lg border w-full h-[110px] border-[var(--border)] bg-[var(--bg-app)]`}>
                            <node.icon size={24} className="text-slate-500 mb-2" />
                            <div className="font-semibold text-[13px] text-[var(--text-primary)] mb-1 leading-tight">{node.title}</div>
                            <div className="text-[11px] text-[var(--text-secondary)] leading-tight">{node.role}</div>
                          </div>
                          {index < arr.length - 1 && (
                            <ArrowLeft className="absolute -right-6 top-1/2 -translate-y-1/2 text-slate-300 z-10" size={20} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Layout: 1 Column */}
                  <div className="flex xl:hidden flex-col items-center gap-4">
                    {[
                      { id: 'ee', title: 'Earth Engine', role: 'Geospatial context', icon: Globe },
                      { id: 'bq', title: 'BigQuery', role: 'Historical / feature data', icon: Database },
                      { id: 'vertex', title: 'Vertex AI', role: 'Predictive impact layer', icon: Activity },
                      { id: 'risk', title: 'Risk Engine', role: 'Authoritative deterministic calculation', icon: Calculator, prominent: true },
                      { id: 'sim', title: 'Simulation Results', role: 'Validated scenario outputs', icon: Target },
                      { id: 'gemini', title: 'Gemini', role: 'Reasoning + action generation', icon: Brain },
                      { id: 'plan', title: 'Action Plan', role: 'Operational decisions', icon: FileText },
                      { id: 'ui', title: 'Command Center', role: 'Decision-support interface', icon: LayoutDashboard }
                    ].map((node, index, arr) => (
                      <Fragment key={node.id}>
                        <div className={`flex flex-col items-center justify-center p-4 text-center rounded-lg border w-full max-w-[280px] h-[110px] ${node.prominent ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-[var(--border)] bg-[var(--bg-app)]'}`}>
                          <node.icon size={24} className={node.prominent ? 'text-blue-600 mb-2' : 'text-slate-500 mb-2'} />
                          <div className="font-semibold text-[13px] text-[var(--text-primary)] mb-1 leading-tight">{node.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] leading-tight">{node.role}</div>
                        </div>
                        {index < arr.length - 1 && (
                          <ArrowDown className="text-slate-300 shrink-0" size={20} />
                        )}
                      </Fragment>
                    ))}
                  </div>
                </section>

                {/* 2. DATA & INPUTS */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">Data Sources & Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="bg-[var(--bg-app)] border border-[var(--border)] rounded-lg p-5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Database size={14} /> BIGQUERY DATASET</h4>
                      <div className="text-[11px] mb-2 font-bold text-blue-600">sanqum.cycloneshield.infrastructure_assets</div>
                      <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                        <li>• Provides 35 verified asset records</li>
                        <li>• Coordinates (latitude/longitude)</li>
                        <li>• Asset Type (Hospitals, Bridges, Power)</li>
                        <li>• Baseline Vulnerability & Criticality</li>
                        <li>• Population Served & Access Routes</li>
                      </ul>
                    </div>
                    <div className="bg-[var(--bg-app)] border border-[var(--border)] rounded-lg p-5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Globe size={14} /> EARTH ENGINE (EE)</h4>
                      <div className="text-[11px] mb-2 font-bold text-blue-600">USGS/SRTMGL1_003 & COPERNICUS/S1_GRD</div>
                      <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                        <li>• Extracts geographic context live from EE</li>
                        <li>• USGS 30m DEM for elevation at asset coords</li>
                        <li>• Sentinel-1 SAR for radar backscatter evidence</li>
                        <li>• Indicates potential flooding/inundation regions</li>
                      </ul>
                    </div>
                    <div className="bg-[var(--bg-app)] border border-[var(--border)] rounded-lg p-5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Activity size={14} /> VERTEX AI</h4>
                      <div className="text-[11px] mb-2 font-bold text-blue-600">Predictive Impact Model (Optional)</div>
                      <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                        <li>• Machine learning predictive capabilities</li>
                        <li>• Trained on historical failure events</li>
                        <li>• Provides damage probability & severity</li>
                        <li>• Only used if endpoint is actively deployed</li>
                      </ul>
                    </div>
                    <div className="bg-[var(--bg-app)] border border-[var(--border)] rounded-lg p-5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Brain size={14} /> GEMINI AI</h4>
                      <div className="text-[11px] mb-2 font-bold text-blue-600">LLM Generation (gemini-flash)</div>
                      <ul className="text-xs space-y-1 text-[var(--text-secondary)]">
                        <li>• Interacts with structural simulation results</li>
                        <li>• Identifies core reasons for specific asset risks</li>
                        <li>• Generates human-readable situation briefings</li>
                        <li>• Proposes timeline-based emergency actions</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 3. HOW RISK IS CALCULATED */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">Deterministic Risk Methodology</h3>
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 mb-6 text-blue-900 font-mono text-sm text-center font-bold">
                    Risk Score = (Hazard × Exposure × Vulnerability) × Category Multiplier
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <div>
                      <strong className="text-xs text-[var(--text-primary)] block mb-1">1. HAZARD (0.0 to 1.0)</strong>
                      <span className="text-xs">Based on wind intensity relative to category, rainfall amount, proximity to cyclone track, and topographic elevation (from EE).</span>
                    </div>
                    <div>
                      <strong className="text-xs text-[var(--text-primary)] block mb-1">2. EXPOSURE (0.0 to 1.0)</strong>
                      <span className="text-xs">Scaled by population served, inherent infrastructure criticality, and lack of alternative access routes.</span>
                    </div>
                    <div>
                      <strong className="text-xs text-[var(--text-primary)] block mb-1">3. VULNERABILITY (0.0 to 1.0)</strong>
                      <span className="text-xs">Asset-specific baseline physical vulnerability (retrieved from BigQuery), modified by asset age or structural type.</span>
                    </div>
                    <div>
                      <strong className="text-xs text-[var(--text-primary)] block mb-1">4. MULTIPLIER</strong>
                      <span className="text-xs">Critical infrastructure gets up to a 1.2x penalty. Scores are converted to a 0-100 scale.</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-xs font-bold mr-2 text-[var(--text-primary)]">THRESHOLDS:</span>
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold">0–20 LOW</span>
                    <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs font-bold">21–40 MEDIUM</span>
                    <span className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs font-bold">41–70 HIGH</span>
                    <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold">71–100 CRITICAL</span>
                  </div>
                  <div className="mt-4 pb-2 text-[11px] italic text-[var(--text-secondary)] leading-relaxed">
                    * The deterministic Risk Engine is the single authoritative source for real-time calculation. Neither BigQuery nor Vertex AI overwrite these deterministic formulas.
                  </div>
                </section>

                {/* 4. GOOGLE AI & DATA SERVICES */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">Google AI & Data Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Google Earth Engine', role: 'Geospatial context', status: dataSourceStatus.earthEngine.toUpperCase(), desc: dataSourceStatus.earthEngine === 'connected' && geoContext ? `Provides real-world geospatial intelligence. Dataset: USGS/SRTMGL1_003. Assets sampled: ${Object.keys(geoContext).length}. Valid elevation samples: ${Object.values(geoContext).filter(c => c.elevationAvailable !== false).length}. Missing elevation samples: ${Object.values(geoContext).filter(c => c.elevationAvailable === false).length}.` : 'Provides real-world geospatial intelligence (elevation, coastal exposure) to enhance deterministic calculations.' },
                      { name: 'Sentinel-1 (Earth Engine)', role: 'Satellite Evidence', status: satelliteEvidence ? (satelliteEvidence.status === 'connected' ? 'CONNECTED' : 'UNAVAILABLE') : 'STANDBY', desc: satelliteEvidence?.status === 'connected' ? `Provides radar backscatter metrics for the ROI. Dataset: ${satelliteEvidence.dataset}. Scenes available: ${satelliteEvidence.scenesAvailable}. Period: ${satelliteEvidence.analysisPeriod}. Comparison: ${satelliteEvidence.comparisonAvailable ? 'Available' : 'Unavailable'}.` : 'Analyzes Sentinel-1 radar imagery for empirical evidence.' },
                      { name: 'BigQuery', role: 'Infrastructure Asset Data', status: dataSourceStatus.bigquery.toUpperCase(), desc: dataSourceStatus.bigquery.toUpperCase() === 'CONNECTED' ? `Connected to sanqum project. BigQuery provides the infrastructure asset feature layer used by the deterministic risk engine. ${assetCount} verified records available.` : 'Currently unavailable. BigQuery acts as the primary data warehouse, providing verified historical infrastructure asset records, baseline vulnerability, and criticality scores.' },
                      { name: 'Vertex AI', role: 'Predictive impact layer', status: dataSourceStatus.vertexAI === 'CONNECTED' ? 'CONNECTED' : (dataSourceStatus.vertexAI === 'CONFIGURED' ? 'STANDBY' : 'UNAVAILABLE'), desc: dataSourceStatus.vertexAI === 'CONNECTED' ? 'Predictive model is actively generating impact probabilities.' : 'Currently unavailable or on standby. Vertex AI provides ML-based predictive analysis of asset failure probabilities based on historical cyclone damage data. Requires a trained model and deployed endpoint.' },
                      { name: 'Gemini', role: 'Risk interpretation and operational action planning', status: dataSourceStatus.gemini === 'CONNECTED' ? 'CONNECTED' : (dataSourceStatus.gemini === 'CONFIGURED' ? 'STANDBY' : (dataSourceStatus.gemini === 'NOT_CONFIGURED' ? 'NOT CONFIGURED' : 'UNAVAILABLE')), desc: 'Interprets deterministic results and generates operational guidance. Will fallback to deterministic rule-based generation if unavailable or quota-limited.' }
                    ].map(svc => (
                      <div key={svc.name} className="flex flex-col border border-[var(--border)] rounded-lg p-5 bg-[var(--bg-app)]">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <strong className="text-sm text-[var(--text-primary)] block mb-1">{svc.name}</strong>
                            <span className="text-[11px] font-semibold text-blue-600">{svc.role}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${svc.status === 'CONNECTED' ? 'bg-green-100 text-green-700' : svc.status === 'UNAVAILABLE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            {svc.status}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">{svc.desc}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. DATA PROVENANCE */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">Data Provenance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                    <div>
                      <strong className="block text-[var(--text-primary)] mb-2">CURRENT SIMULATION INPUTS</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Scenario parameters</li>
                        <li>Infrastructure asset data</li>
                        <li>Deterministic risk calculations</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="block text-[var(--text-primary)] mb-2">GEOSPATIAL CONTEXT</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Earth Engine when connected</li>
                        <li>Demo/fallback state when unavailable</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="block text-[var(--text-primary)] mb-2">PREDICTIVE LAYER</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>BigQuery historical features</li>
                        <li>Vertex AI model only when a genuine trained model is available</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="block text-[var(--text-primary)] mb-2">AI REASONING</strong>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Gemini when available</li>
                        <li>Deterministic fallback when Gemini is unavailable</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 6. MODEL BOUNDARIES */}
                <section>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4 tracking-wide uppercase">Model Boundaries</h3>
                  <div className="bg-[var(--bg-app)] border border-[var(--border)] rounded-lg p-5">
                    <ul className="list-disc pl-5 space-y-3 text-sm text-[var(--text-secondary)]">
                      <li>CycloneShield is a scenario-based infrastructure decision-support system, not a cyclone forecasting system.</li>
                      <li>The deterministic Risk Engine produces the current authoritative risk score.</li>
                      <li>Vertex AI is a predictive extension and requires genuine labelled historical data and a deployed model.</li>
                      <li>Gemini interprets structured simulation outputs and should not modify deterministic risk scores.</li>
                      <li>Geospatial context may operate in DEMO/FALLBACK mode when the external service is unavailable.</li>
                    </ul>
                  </div>
                </section>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;