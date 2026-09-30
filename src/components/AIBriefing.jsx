import { useState, useEffect } from 'react';
import { Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import { analyzeRisk } from '../services/gemini';

export function AIBriefing({ scenario, results, predictiveImpacts = {}, fullView = false }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchBriefing() {
      if (scenario.windSpeed < 50) {
        setBriefing(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      const criticalCount = results.filter(r => r.category === 'CRITICAL').length;
      const highCount = results.filter(r => r.category === 'HIGH').length;
      const popExposed = results.reduce((acc, r) => r.hazard > 0.2 ? acc + r.populationServed : acc, 0);

      const criticalAssets = results.filter(r => r.category === 'CRITICAL').map(r => ({
        name: r.name,
        type: r.type,
        risk: r.risk,
        vulnerability: r.baseVulnerability,
        populationServed: r.populationServed,
        accessRoutes: r.accessRoutes,
        predictiveImpact: predictiveImpacts[r.id] || null
      }));

      const highRiskAssets = results.filter(r => r.category === 'HIGH').map(r => ({
        name: r.name,
        type: r.type,
        risk: r.risk,
        vulnerability: r.baseVulnerability,
        populationServed: r.populationServed,
        accessRoutes: r.accessRoutes,
        predictiveImpact: predictiveImpacts[r.id] || null
      }));

      const simulationData = {
        scenario,
        riskSummary: { criticalCount, highCount, populationExposed: popExposed },
        criticalAssets,
        highRiskAssets
      };

      const generateFallback = () => {
        return {
          type: 'DETERMINISTIC',
          summary: `Category ${scenario.category} cyclone with ${scenario.windSpeed} km/h winds. Simulated track shift of ${scenario.trackShift} km exposes ${(popExposed/1000000).toFixed(2)}M people.`,
          criticalAssets: results.filter(r => r.category === 'CRITICAL').slice(0, 5).map(r => ({
            asset: r.name,
            risk: r.risk,
            reason: `Vulnerability: ${(r.baseVulnerability * 100).toFixed(0)}%, Hazard: ${(r.hazard * 100).toFixed(0)}%`
          })),
          riskReasons: [
            "Proximity to simulated cyclone track.",
            "High infrastructure baseline vulnerability.",
            "Significant rainfall exposure."
          ],
          whyThisMatters: `${criticalCount} critical assets are expected to fail or become inaccessible under current scenario conditions.`,
          recommendedActions: [
            { timeframe: "0-6 HOURS", priority: "HIGH", action: "Evacuate high-hazard zones immediately.", asset: "General Population" },
            { timeframe: "0-6 HOURS", priority: "CRITICAL", action: "Deploy backup generators and test systems.", asset: "Hospitals" },
            { timeframe: "6-12 HOURS", priority: "HIGH", action: "Close vulnerable bridges and coordinate alternative routing.", asset: "Bridges" },
            { timeframe: "12-24 HOURS", priority: "MEDIUM", action: "Pre-position repair crews outside hazard boundary.", asset: "Power Grid" }
          ],
          confidence: 90
        };
      };

      try {
        const aiData = await analyzeRisk(simulationData);
        if (active) {
          // Cross-reference AI risk values with deterministic results
          // We map over critical assets to ensure AI doesn't modify risk scores
          const sanitizedAssets = (aiData.criticalAssets || []).map(aiAsset => {
            const deterministicAsset = results.find(r => r.name === aiAsset.asset);
            return {
              ...aiAsset,
              risk: deterministicAsset ? deterministicAsset.risk : aiAsset.risk
            };
          });

          setBriefing({ ...aiData, criticalAssets: sanitizedAssets });
        }
      } catch (err) {
        if (active) {
          console.error('AI Briefing Error:', err);
          // Fallback on error
          setBriefing(generateFallback());
          setError(err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    // Call it immediately on change, as the UI waits for "Run Simulation" 
    // before updating `scenario` props. 
    fetchBriefing();

    return () => { active = false; };
  }, [scenario, results, predictiveImpacts]);

  return (
    <div className={`panel ${fullView ? 'full-view-panel' : ''}`} style={fullView ? { minHeight: '600px' } : {}}>
      <div className="panel-header">
        <div className="panel-title">
          <Cpu size={16} color="var(--primary)" />
          {briefing?.type === 'DETERMINISTIC' ? 'DETERMINISTIC SCENARIO ANALYSIS' : 'AI RISK BRIEF'}
          {briefing && (
            <span className="badge badge-outline" style={{ marginLeft: '12px', fontSize: '10px' }}>
              {briefing.type === 'DETERMINISTIC' ? 'DETERMINISTIC ANALYSIS' : 'GEMINI ANALYSIS'}
            </span>
          )}
        </div>
      </div>
      
      <div className="panel-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            <Cpu size={16} className="loading-spinner" />
            Analyzing scenario...
          </div>
        ) : briefing ? (
          <>
            {error && (
              <div style={{ padding: '8px', background: 'rgba(220,38,38,0.1)', color: 'var(--risk-critical)', fontSize: '12px', marginBottom: '12px', borderRadius: '4px' }}>
                AI analysis unavailable — showing deterministic scenario analysis.
              </div>
            )}
            <div className="ai-section">
              <div className="ai-section-title">OVERALL SITUATION</div>
              <div className="ai-text">{briefing.summary || briefing.overallSituation}</div>
            </div>

            {briefing.criticalAssets && briefing.criticalAssets.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-title">CRITICAL ASSETS</div>
                <div className="ai-list">
                  {briefing.criticalAssets.map((asset, idx) => (
                    <div key={idx} className="ai-list-item">
                      <div style={{ fontWeight: 600, minWidth: '120px' }}>{asset.asset || asset.name}</div>
                      <div className="color-critical" style={{ fontWeight: 700, minWidth: '40px' }}>{asset.risk || asset.riskScore}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{asset.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {briefing.whyThisMatters && (
              <div className="ai-section">
                <div className="ai-section-title">WHY THIS MATTERS</div>
                <div className="ai-text">{briefing.whyThisMatters}</div>
              </div>
            )}

            <div className="ai-section">
              <div className="ai-section-title">OPERATIONAL ACTION PLAN</div>
              {fullView ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {['0-6 HOURS', '6-12 HOURS', '12-24 HOURS'].map(timeframe => {
                    const actions = briefing.recommendedActions?.filter(a => a.timeframe === timeframe);
                    if (!actions || actions.length === 0) return null;
                    return (
                      <div key={timeframe} style={{ background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          {timeframe}
                        </div>
                        <div className="ai-list" style={{ gap: '8px' }}>
                          {actions.map((action, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px' }}>
                              <CheckCircle2 size={14} color="var(--primary)" style={{ marginTop: '3px' }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{action.action}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                                  <span className={`color-${action.priority.toLowerCase()}`} style={{ fontWeight: 'bold' }}>{action.priority}</span> • {action.asset}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ai-list" style={{ gap: '4px' }}>
                  {briefing.recommendedActions && briefing.recommendedActions.slice(0, 3).map((action, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px' }}>
                      <CheckCircle2 size={14} color="var(--primary)" style={{ marginTop: '3px' }} />
                      <span style={{ color: 'var(--text-primary)' }}>
                        {action.action ? `[${action.priority}] ${action.action}` : action}
                      </span>
                    </div>
                  ))}
                  {briefing.recommendedActions?.length > 3 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '22px' }}>
                      + Open Action Plan tab for full timeline
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                CONFIDENCE LEVEL
              </div>
              <div className="badge badge-outline">
                <div className={`status-dot ${briefing.confidence >= 80 || briefing.confidence === 'HIGH' ? 'bg-low' : 'bg-medium'}`}></div>
                {briefing.confidence}
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Scenario intensity too low to warrant an automated strategic brief.
          </div>
        )}
      </div>
    </div>
  );
}
