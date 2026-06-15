import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitFeedback } from '../../api/client';

export default function FeedbackWidget({ predictionId }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!predictionId) return null;

  const handleFeedback = async (isAccurate) => {
    setLoading(true);
    setError(null);
    try {
      await submitFeedback({
        prediction_id: predictionId,
        is_accurate: isAccurate,
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            className="text-center py-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="text-4xl mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
            >
              ✅
            </motion.div>
            <p className="text-sm text-risk-low font-medium">Thank you for your feedback!</p>
            <p className="text-xs text-text-muted mt-1">Your input helps improve predictions</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <p className="text-sm text-text-secondary mb-4 text-center">
              Is this prediction accurate based on current ground reality?
            </p>
            {error && (
              <p className="text-xs text-risk-high mb-3 text-center">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleFeedback(true)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                  border border-risk-low/30 text-risk-low hover:bg-risk-low/10
                  disabled:opacity-50 cursor-pointer"
              >
                ✅ Accurate
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                  border border-risk-high/30 text-risk-high hover:bg-risk-high/10
                  disabled:opacity-50 cursor-pointer"
              >
                ❌ Inaccurate
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
