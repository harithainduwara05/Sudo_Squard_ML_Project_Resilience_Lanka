import { useState } from 'react';
import PredictionForm from '../components/predict/PredictionForm';
import ResultCard from '../components/predict/ResultCard';
import FeedbackWidget from '../components/predict/FeedbackWidget';

export default function DashboardPage() {
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
