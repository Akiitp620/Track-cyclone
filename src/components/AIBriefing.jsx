import { useState, useEffect } from 'react';
import { Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import { analyzeRisk } from '../services/gemini';

export function AIBriefing({ scenario, results, predictiveImpacts = {}, fullView = false, onGeminiStatus }) {
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
        const actions = [];
        const criticalList = results.filter(r => r.category === 'CRITICAL');
        const highList = results.filter(r => r.category === 'HIGH');

        if (criticalList.length > 0) {
            criticalList.slice(0, 3).forEach(asset => {
                actions.push({ timeframe: "0-6 HOURS", priority: "CRITICAL", action: `Immediately secure and evacuate if necessary. Ensure backup systems are online.`, asset: asset.name });
            });
        }
        if (highList.length > 0) {
            highList.slice(0, 2).forEach(asset => {
                actions.push({ timeframe: "6-12 HOURS", priority: "HIGH", action: `Deploy repair crews and stage equipment nearby.`, asset: asset.name });
            });
        }
        if (actions.length === 0) {
            actions.push({ timeframe: "12-24 HOURS", priority: "MEDIUM", action: "Monitor situation and prepare for escalation.", asset: "General Population" });
        }

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
          recommendedActions: actions,
          confidence: 90
        };
      };

      try {
        const aiData = await analyzeRisk(simulationData);
        if (active) {
          if (onGeminiStatus) onGeminiStatus('CONNECTED');
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
          if (onGeminiStatus) onGeminiStatus('UNAVAILABLE');
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
              <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-400 text-xs font-medium">
                <AlertCircle size={14} className="flex-shrink-0" />
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
                <div className="flex flex-col gap-4">
                  {['0-6 HOURS', '6-12 HOURS', '12-24 HOURS'].map(timeframe => {
                    const actions = briefing.recommendedActions?.filter(a => a.timeframe === timeframe);
                    if (!actions || actions.length === 0) return null;
                    return (
                      <div key={timeframe} className="bg-white dark:bg-[var(--bg-app)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
                        <div className="px-4 py-2 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider">
                            {timeframe}
                          </span>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                          {actions.map((action, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <CheckCircle2 size={16} color="var(--primary)" className="mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-[var(--text-primary)] mb-1">{action.action}</span>
                                <div className="flex items-center text-xs text-[var(--text-secondary)]">
                                  <span className={`font-bold color-${action.priority.toLowerCase()}`}>{action.priority}</span>
                                  <span className="mx-1.5 opacity-50">•</span>
                                  <span>{action.asset}</span>
                                </div>
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
