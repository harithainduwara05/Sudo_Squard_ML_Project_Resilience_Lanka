import { motion } from 'framer-motion';

const cardData = [
  {
    icon: '📊',
    label: 'Total Predictions',
    key: 'total_predictions',
    fallback: 0,
    accent: '#06b6d4',
    format: (v) => v.toLocaleString(),
  },
  {
    icon: '🔴',
    label: 'High Risk Alerts',
    key: 'high_risk_count',
    fallback: 0,
    accent: '#ef4444',
    format: (v) => v.toLocaleString(),
  },
  {
    icon: '📈',
    label: 'Avg Risk Score',
    key: 'average_risk_score',
    fallback: 0,
    accent: '#f59e0b',
    format: (v) => (typeof v === 'number' ? v.toFixed(3) : v),
  },
  {
    icon: '✅',
    label: 'Model Accuracy',
    key: 'accuracy',
    fallback: 94.2,
    accent: '#10b981',
    format: (v) => `${v}%`,
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function StatsCards({ data = {} }) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cardData.map((card) => {
        const value = data[card.key] ?? card.fallback;
        return (
          <motion.div
            key={card.key}
            className="glass-card p-5 relative overflow-hidden group"
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            {/* Accent gradient border top */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${card.accent}, transparent)` }}
            />

            {/* Background glow */}
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle, ${card.accent}, transparent)` }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-xs text-text-muted uppercase tracking-wider font-medium">
                  {card.label}
                </span>
              </div>
              <p
                className="text-3xl font-bold tabular-nums tracking-tight"
                style={{ color: card.accent }}
              >
                {card.format(value)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
