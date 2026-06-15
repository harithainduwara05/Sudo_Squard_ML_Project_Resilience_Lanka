import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { getRiskLevel } from '../../utils/constants';

export default function RiskGauge({ score = 0 }) {
  const risk = useMemo(() => getRiskLevel(score), [score]);

  // Animated score value
  const springScore = useSpring(0, { stiffness: 40, damping: 20 });
  const displayScore = useTransform(springScore, (v) => v.toFixed(2));

  useEffect(() => {
    springScore.set(score);
  }, [score, springScore]);

  // SVG arc parameters
  const size = 280;
  const strokeWidth = 18;
  const cx = size / 2;
  const cy = size / 2 + 20;
  const radius = (size - strokeWidth) / 2 - 10;

  // Arc helper (180° to 0° — left to right semicircle)
  const polarToCartesian = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const describeArc = (startAngle, endAngle) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArc = startAngle - endAngle > 180 ? 1 : 0;
    return `M ${end.x} ${end.y} A ${radius} ${radius} 0 ${largeArc} 0 ${start.x} ${start.y}`;
  };

  // Segment definitions (angle goes from 180° to 0° as score goes 0 to 1)
  const segments = [
    { start: 180, end: 126, color: '#10b981' },  // 0–0.3
    { start: 126, end: 72, color: '#f59e0b' },    // 0.3–0.6
    { start: 72, end: 36, color: '#ef4444' },      // 0.6–0.8
    { start: 36, end: 0, color: '#dc2626' },       // 0.8–1.0
  ];

  // Needle angle
  const needleAngle = 180 - score * 180;

  const needleEnd = polarToCartesian(needleAngle);
  const needleLength = radius - 15;
  const needleTip = {
    x: cx + needleLength * Math.cos((needleAngle * Math.PI) / 180),
    y: cy - needleLength * Math.sin((needleAngle * Math.PI) / 180),
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 60 }}>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-2xl"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${risk.color}40, transparent 70%)`,
          }}
        />

        <svg width={size} height={size / 2 + 60} viewBox={`0 0 ${size} ${size / 2 + 60}`}>
          {/* Background arc */}
          <path
            d={describeArc(180, 0)}
            fill="none"
            stroke="rgba(30, 41, 59, 0.6)"
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
          />

          {/* Colored segments */}
          {segments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.35}
            />
          ))}

          {/* Active arc up to current score */}
          <motion.path
            d={describeArc(180, Math.max(180 - score * 180, 0.5))}
            fill="none"
            stroke={risk.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${risk.color}80)` }}
          />

          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const angle = 180 - tick * 180;
            const outerR = radius + strokeWidth / 2 + 4;
            const innerR = radius + strokeWidth / 2 + 12;
            const outer = {
              x: cx + outerR * Math.cos((angle * Math.PI) / 180),
              y: cy - outerR * Math.sin((angle * Math.PI) / 180),
            };
            const inner = {
              x: cx + innerR * Math.cos((angle * Math.PI) / 180),
              y: cy - innerR * Math.sin((angle * Math.PI) / 180),
            };
            return (
              <g key={i}>
                <line
                  x1={outer.x} y1={outer.y}
                  x2={inner.x} y2={inner.y}
                  stroke="rgba(148, 163, 184, 0.4)"
                  strokeWidth="1.5"
                />
                <text
                  x={inner.x}
                  y={inner.y + (angle > 90 ? -6 : -6)}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.5)"
                  fontSize="10"
                  fontFamily="Inter"
                >
                  {tick.toFixed(1) === '0.0' ? '0' : tick.toFixed(1) === '1.0' ? '1' : tick.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Needle */}
          <motion.line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={risk.color}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ x2: cx - needleLength, y2: cy }}
            animate={{ x2: needleTip.x, y2: needleTip.y }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 4px ${risk.color}60)` }}
          />

          {/* Needle center dot */}
          <circle cx={cx} cy={cy} r="6" fill={risk.color} />
          <circle cx={cx} cy={cy} r="3" fill="var(--color-bg-deep)" />
        </svg>

        {/* Center text */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '8px' }}>
          <div className="text-center">
            <motion.div
              className="text-4xl font-black tabular-nums tracking-tight"
              style={{ color: risk.color }}
            >
              {displayScore}
            </motion.div>
            <div
              className={`text-xs font-bold tracking-[0.2em] uppercase mt-1 ${
                risk.level === 'CRITICAL' ? 'animate-pulse-glow' : ''
              }`}
              style={{
                color: risk.color,
                textShadow: `0 0 12px ${risk.color}60`,
              }}
            >
              {risk.level} RISK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
