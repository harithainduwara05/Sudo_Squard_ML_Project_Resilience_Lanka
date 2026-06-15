import { motion } from 'framer-motion';
import { getRiskLevel, DISTRICTS } from '../../utils/constants';

export default function RecentPredictions({ predictions = [] }) {
  return (
    <motion.div
      className="glass-card p-6 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h3 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
        <span className="text-xl">🕐</span>
        Recent Predictions
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
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Risk Score</th>
                <th className="text-left py-3 px-3 text-text-muted text-xs uppercase tracking-wider font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred, i) => {
                const score = pred.flood_risk_score ?? pred.risk_score ?? 0;
                const risk = getRiskLevel(score);
                const district = DISTRICTS[pred.district] || `District ${pred.district}`;
                const time = pred.timestamp
                  ? new Date(pred.timestamp).toLocaleString()
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
                    <td className="py-3 px-3">
                      <span className="font-mono font-semibold" style={{ color: risk.color }}>
                        {score.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          risk.level === 'CRITICAL' ? 'animate-pulse-glow' : ''
                        }`}
                        style={{
                          background: risk.bgColor,
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
