import { motion } from 'framer-motion';
import { getRiskLevel, DISTRICTS } from '../../utils/constants';

function resolveDistrict(pred) {
  // The prediction might have district_name from backend (user-scoped)
  if (pred.district_name && pred.district_name !== 'Unknown') return pred.district_name;
  // Check input_data.district (numeric index)
  const distIdx = pred.input_data?.district ?? pred.district;
  if (typeof distIdx === 'number' && distIdx >= 0 && distIdx < DISTRICTS.length) {
    return DISTRICTS[distIdx];
  }
  if (typeof distIdx === 'string') {
    const idx = parseInt(distIdx);
    if (!isNaN(idx) && idx >= 0 && idx < DISTRICTS.length) return DISTRICTS[idx];
  }
  return 'Unknown';
}

export default function RecentPredictions({ predictions = [], isUserScoped = false }) {
  return (
    <motion.div
      className="glass-card p-6 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
        <span className="text-xl">🕐</span>
        {isUserScoped ? 'Your Recent Predictions' : 'Recent Predictions'}
      </h3>

      {predictions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-40">📭</div>
          <p className="text-text-muted text-sm">No predictions recorded yet</p>
          <p className="text-text-muted text-xs mt-1">Make a prediction to see results here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Time</th>
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">District</th>
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Location</th>
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Risk Score</th>
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred, i) => {
                const score = pred.flood_risk_score ?? pred.risk_score ?? 0;
                const risk = pred.risk_level
                  ? { level: pred.risk_level, color: pred.risk_color || getRiskLevel(score).color, bgColor: getRiskLevel(score).bgColor }
                  : getRiskLevel(score);
                const district = resolveDistrict(pred);
                const lat = pred.input_data?.latitude ?? pred.latitude;
                const lng = pred.input_data?.longitude ?? pred.longitude;
                const time = pred.timestamp || pred.created_at
                  ? new Date(pred.timestamp || pred.created_at).toLocaleString()
                  : '—';

                return (
                  <tr
                    key={pred.prediction_id || i}
                    className="border-b border-border-subtle/50 transition-colors duration-200 hover:bg-white/[0.02]"
                    style={{
                      backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.3)',
                    }}
                  >
                    <td className="py-3 px-3 text-text-secondary text-xs font-mono">{time}</td>
                    <td className="py-3 px-3 text-text-primary font-medium">{district}</td>
                    <td className="py-3 px-3 text-text-muted text-xs font-mono">
                      {lat ? `${Number(lat).toFixed(3)}°N` : '—'},{' '}
                      {lng ? `${Number(lng).toFixed(3)}°E` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-semibold" style={{ color: risk.color }}>
                        {typeof score === 'number' ? score.toFixed(3) : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          risk.level === 'CRITICAL' ? 'animate-pulse-glow' : ''
                        }`}
                        style={{
                          background: risk.bgColor || `${risk.color}20`,
                          color: risk.color,
                          border: `1px solid ${risk.color}25`,
                        }}
                      >
                        {risk.level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
