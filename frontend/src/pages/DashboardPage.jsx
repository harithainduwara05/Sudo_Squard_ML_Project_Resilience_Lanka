import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PredictionForm from '../components/predict/PredictionForm';
import ResultCard from '../components/predict/ResultCard';
import FeedbackWidget from '../components/predict/FeedbackWidget';
import SimulationWidget from '../components/predict/SimulationWidget';

export default function DashboardPage() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const predictionId = result?.prediction_id || result?.id;

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent">
            Real-Time Flood Risk
          </span>
          <span className="text-text-primary"> Dashboard</span>
        </h2>
        <p className="text-text-muted text-sm max-w-2xl">
          Leverage machine learning to predict flood vulnerability across Sri Lanka. 
          Enter environmental parameters for instant risk assessment.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form — 3 cols */}
        <div className="lg:col-span-3">
          <PredictionForm onResult={setResult} onLoading={setLoading} />
        </div>

        {/* Results — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              <ResultCard result={result} />
              
              {user?.role === 'researcher' && result?.feature_importance && (
                <div className="glass-card p-6 border-l-4" style={{ borderColor: '#8b5cf6' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <h3 className="font-semibold text-text-primary">Model Insights (XAI)</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Researcher Only
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mb-5">
                    Top contributing factors to this specific flood risk score:
                  </p>
                  
                  <div className="space-y-4">
                    {result.feature_importance.map((feature, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-text-secondary">{feature.feature}</span>
                          <span className="text-purple-400 font-medium">{feature.importance}%</span>
                        </div>
                        <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                            style={{ width: `${feature.importance}%`, transition: 'width 1s ease-out' }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Simulation Widget */}
              {user?.role === 'researcher' && result && (
                <SimulationWidget baseRequest={result.input_data || result} />
              )}

              <FeedbackWidget predictionId={predictionId} />
            </>
          ) : (
            /* Placeholder when no result */
            <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4 opacity-20">🌊</div>
              <h3 className="text-lg font-semibold text-text-secondary mb-2">
                Awaiting Assessment
              </h3>
              <p className="text-sm text-text-muted max-w-xs">
                Fill in the environmental parameters and click 
                <span className="text-primary-light font-medium"> Analyze Flood Risk</span> to 
                see your prediction results here.
              </p>
              <div className="mt-6 flex gap-2">
                {['#10b981', '#f59e0b', '#ef4444', '#dc2626'].map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full opacity-40"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
