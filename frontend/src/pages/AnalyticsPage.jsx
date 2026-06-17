import { useState, useEffect } from 'react';
import StatsCards from '../components/analytics/StatsCards';
import RecentPredictions from '../components/analytics/RecentPredictions';
import { getAnalytics, getMyPredictions } from '../api/client';

function SkeletonCard() {
  return <div className="skeleton h-28 rounded-2xl" />;
}

function SkeletonTable() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="skeleton h-6 w-48 rounded" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-10 rounded" />
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [myPredictions, setMyPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Fetch both global analytics and user's own predictions
        const [analytics, userPreds] = await Promise.allSettled([
          getAnalytics(),
          getMyPredictions(),
        ]);

        if (!cancelled) {
          if (analytics.status === 'fulfilled') {
            setData(analytics.value);
          } else {
            setError('Unable to fetch analytics. Backend may be offline.');
            setData({
              total_predictions: 0,
              high_risk_count: 0,
              avg_risk_score: 0,
              accuracy: 0,
              recent_predictions: [],
            });
          }

          if (userPreds.status === 'fulfilled') {
            setMyPredictions(userPreds.value?.predictions || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Unable to fetch analytics. Backend may be offline.');
          setData({
            total_predictions: 0,
            high_risk_count: 0,
            avg_risk_score: 0,
            accuracy: 0,
            recent_predictions: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Use user predictions if available, otherwise fall back to global
  const displayPredictions = myPredictions.length > 0
    ? myPredictions
    : (data?.recent_predictions || []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent">
            Analytics
          </span>
          <span className="text-text-primary"> Overview</span>
        </h2>
        <p className="text-text-muted text-sm max-w-2xl">
          Track your prediction history, risk distributions, and model performance across Sri Lanka.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-3 rounded-xl glass-card border-risk-medium/30 text-sm text-risk-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="mb-8">
          <StatsCards data={data} myPredictionCount={myPredictions.length} />
        </div>
      )}

      {/* Recent Predictions */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <RecentPredictions predictions={displayPredictions} isUserScoped={myPredictions.length > 0} />
      )}
    </div>
  );
}
