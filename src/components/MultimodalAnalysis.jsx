import React, { useState, useRef } from 'react';
import { analyzeMultimodal } from '../services/multimodal';

export default function MultimodalAnalysis({
  scenario,
  riskSummary,
  criticalAssets,
  highRiskAssets,
  geoContext
}) {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('USER_PROVIDED');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSourceLabel('USER_PROVIDED');
    setAnalysisResult(null);
  };

  const handleDemoImage = async () => {
    try {
      // Create a simple blank/gray placeholder demo image on the fly
      // A more complex real demo image could be fetched if available in public/
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('DEMO VISUAL EVIDENCE', 80, 150);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "demo_evidence.jpg", { type: "image/jpeg" });
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setSourceLabel('DEMO');
        setAnalysisResult(null);
      }, 'image/jpeg');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeMultimodal({
        image: imageFile,
        source: sourceLabel,
        scenario,
        riskSummary,
        criticalAssets,
        highRiskAssets,
        geoContext
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error('Failed to analyze multimodal image', error);
      alert('Failed to analyze image: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSourceBadgeText = () => {
    if (sourceLabel === 'USER_PROVIDED') return 'USER PROVIDED';
    if (sourceLabel === 'EARTH_ENGINE') return 'EARTH ENGINE';
    return 'DEMO EVIDENCE';
  };

  const isDemo = sourceLabel === 'DEMO' || (analysisResult && analysisResult.visualSummary.includes('DEMO'));

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col mb-6">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span className="text-indigo-400">👁️</span> Visual Evidence Analysis
        </h2>
      </div>

      <div className="p-6">
        {!previewUrl ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-12 bg-slate-800/50">
            <p className="text-slate-400 mb-4 text-center">
              Upload a satellite, aerial, or infrastructure image to analyze visually alongside the deterministic risk context.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Upload Image
              </button>
              <button 
                onClick={handleDemoImage}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded font-medium transition-colors"
              >
                Use Demo Image
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/jpeg, image/png, image/webp" 
              className="hidden"
            />
            <p className="text-slate-500 text-sm mt-4">Supported: JPEG, PNG, WebP (Max 5MB)</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative w-full md:w-1/2 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                <img src={previewUrl} alt="Visual evidence preview" className="w-full h-auto object-cover max-h-64" />
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur text-xs font-bold px-2 py-1 rounded text-slate-200 uppercase tracking-wider border border-slate-700">
                  {getSourceBadgeText()}
                </div>
                {sourceLabel === 'DEMO' && (
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="bg-red-900/90 text-red-200 text-xs font-bold px-2 py-1 rounded">NOT LIVE SATELLITE DATA</span>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setPreviewUrl(null);
                    setImageFile(null);
                    setAnalysisResult(null);
                  }}
                  className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-900/80 text-white w-8 h-8 rounded flex items-center justify-center transition-colors"
                  disabled={isAnalyzing}
                >
                  ✕
                </button>
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col justify-center">
                {!analysisResult ? (
                  <div className="flex flex-col items-start gap-4">
                    <h3 className="text-xl font-bold text-slate-200">Ready for Analysis</h3>
                    <p className="text-slate-400">
                      Gemini will interpret this visual evidence strictly within the context of the active scenario deterministic risk data.
                    </p>
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className={`px-6 py-3 rounded-lg font-bold text-white transition-all flex items-center gap-2 ${
                        isAnalyzing 
                          ? 'bg-indigo-800 cursor-wait' 
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                          Gemini is analyzing visual evidence...
                        </>
                      ) : (
                        'Analyze with Gemini'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 h-full flex flex-col">
                    <h3 className="text-lg font-bold text-slate-200 mb-2">VISUAL SUMMARY</h3>
                    <p className={`text-sm ${isDemo ? 'text-amber-400 font-medium' : 'text-slate-300'}`}>
                      {analysisResult.visualSummary}
                    </p>
                    {isDemo && (
                      <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-amber-500/70 font-mono">DEMO MODE ACTIVE</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {analysisResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                
                {/* Visual Observations */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Visual Observations</h4>
                  {analysisResult.visualObservations?.length > 0 ? (
                    <ul className="space-y-2">
                      {analysisResult.visualObservations.map((obs, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{obs.observation} <span className="text-slate-500 text-xs">(Conf: {obs.confidence}%)</span></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">None reported.</p>
                  )}
                </div>

                {/* Infrastructure Concerns */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Infrastructure Concerns</h4>
                  {analysisResult.infrastructureConcerns?.length > 0 ? (
                    <ul className="space-y-3">
                      {analysisResult.infrastructureConcerns.map((inc, i) => (
                        <li key={i} className="text-sm text-slate-300 flex flex-col">
                          <span className="font-semibold text-rose-400">{inc.asset}</span>
                          <span className="text-slate-400">{inc.concern}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">None reported.</p>
                  )}
                </div>

                {/* Exposure Pathways */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Exposure Pathways</h4>
                  {analysisResult.exposurePathways?.length > 0 ? (
                    <ul className="space-y-1">
                      {analysisResult.exposurePathways.map((path, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">~</span>
                          <span>{path}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">None reported.</p>
                  )}
                </div>

                {/* Operational Considerations */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Operational Considerations</h4>
                  {analysisResult.operationalConsiderations?.length > 0 ? (
                    <ul className="space-y-2">
                      {analysisResult.operationalConsiderations.map((op, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                            op.priority === 'HIGH' ? 'bg-rose-900/50 text-rose-300' :
                            op.priority === 'MEDIUM' ? 'bg-amber-900/50 text-amber-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {op.priority}
                          </span>
                          <span>{op.action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">None reported.</p>
                  )}
                </div>

                {/* Uncertainties */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 md:col-span-2">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Uncertainties & Limitations</h4>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono">
                      VISUAL CONFIDENCE: {analysisResult.confidence}%
                    </span>
                  </div>
                  {analysisResult.uncertainties?.length > 0 ? (
                    <ul className="space-y-1">
                      {analysisResult.uncertainties.map((unc, i) => (
                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="text-slate-500 mt-0.5">?</span>
                          <span>{unc}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">None reported.</p>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
