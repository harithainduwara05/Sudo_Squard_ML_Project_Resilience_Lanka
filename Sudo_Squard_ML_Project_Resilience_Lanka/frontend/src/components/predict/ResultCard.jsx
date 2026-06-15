import { motion } from 'framer-motion';
import RiskGauge from './RiskGauge';
import { getRiskLevel } from '../../utils/constants';

export default function ResultCard({ result }) {
  if (!result) return null;

  const score = result.flood_risk_score ?? result.risk_score ?? 0;
  const risk = getRiskLevel(score);
  const predictionId = result.prediction_id || result.id || 'N/A';
  const timestamp = result.timestamp || new Date().toLocaleString();

  return (
    <motion.div
      className="glass-card p-6 sm:p-8"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
        <span className="text-xl">📊</span>
        Risk Assessment Result
      </h3>

      {/* Gauge */}
      <RiskGauge score={score} />

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {/* Prediction ID */}
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Prediction ID</p>
          <p className="text-xs font-mono text-text-secondary truncate" title={predictionId}>
            {typeof predictionId === 'string' && predictionId.length > 12
              ? `${predictionId.slice(0, 12)}...`
              : predictionId}
          </p>
        </div>

        {/* Timestamp */}
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Timestamp</p>
          <p className="text-xs font-mono text-text-secondary">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Risk Badge */}
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Severity</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              risk.level === 'CRITICAL' ? 'animate-pulse-glow' : ''
            }`}
            style={{
              background: risk.bgColor,
              color: risk.color,
              border: `1px solid ${risk.color}30`,
            }}
          >
            {risk.level}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
