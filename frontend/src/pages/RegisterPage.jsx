import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/client';

/* ─── Floating Stat Card (Hero section) ─── */
function FloatingStat({ value, label, delay, top, left, right }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      className="absolute"
      style={{ top, left, right }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '20px 28px',
          minWidth: '180px',
        }}
      >
        <p style={{ color: '#22d3ee', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: '6px', letterSpacing: '0.5px' }}>{label}</p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Wave SVG Background ─── */
function WaveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />

      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '40%', opacity: 0.12 }}>
        <path fill="#06b6d4"
          d="M0,160L48,170.7C96,181,192,203,288,202.7C384,203,480,181,576,165.3C672,149,768,139,864,154.7C960,171,1056,213,1152,218.7C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '30%', opacity: 0.08 }}>
        <path fill="#3b82f6"
          d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,229.3C672,235,768,213,864,202.7C960,192,1056,192,1152,197.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </svg>
    </div>
  );
}

/* ─── Eye Icon Components ─── */
function EyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─── Spinner ─── */
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ─── Styled Input ─── */
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid rgba(56, 189, 248, 0.1)',
  background: 'rgba(30, 41, 59, 0.6)',
  color: '#f1f5f9',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.3s, box-shadow 0.3s',
};

const labelStyle = {
  color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500,
  display: 'block', marginBottom: '6px',
  letterSpacing: '0.5px', textTransform: 'uppercase',
};

function focusHandler(e) {
  e.target.style.borderColor = '#06b6d4';
  e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
}
function blurHandler(e) {
  e.target.style.borderColor = 'rgba(56, 189, 248, 0.1)';
  e.target.style.boxShadow = 'none';
}

export default function RegisterPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (fullName.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser({
        full_name: fullName.trim(),
        email,
        organization: organization.trim() || undefined,
        password,
      });
      login(data);
      navigate('/', { replace: true });
    } catch (err) {
      // err.detail can be a string OR an array of validation error objects from FastAPI
      if (typeof err.detail === 'string') {
        setError(err.detail);
      } else if (Array.isArray(err.detail)) {
        setError(err.detail.map(e => e.msg).join(', '));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0f1e' }}>
      {/* ─── Left Hero Section (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0c1929 0%, #0a1628 40%, #0d1f3c 100%)' }}
      >
        <WaveBackground />

        <div className="relative z-10 px-16 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div style={{
                width: 48, height: 48, borderRadius: '14px',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                  <path d="M8 20 Q12 14, 16 20 Q20 26, 24 20 Q28 14, 28 18" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M8 16 Q12 10, 16 16 Q20 22, 24 16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
                </svg>
              </div>
            </div>

            <h2 style={{
              fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.15,
              background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Join the<br />Platform
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '16px', lineHeight: 1.6 }}>
              Get access to real-time flood risk<br />predictions and analytics
            </p>

            <div style={{
              width: 60, height: 3, borderRadius: 2, marginTop: 32, marginBottom: 32,
              background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
            }} />

            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Join disaster management officers and researchers already using Resilience Lanka to protect communities.
            </p>
          </motion.div>

          {/* Floating Stats */}
          <FloatingStat value="500+" label="Active Users" delay={0.4} top="12%" right="10%" />
          <FloatingStat value="1.2M" label="Predictions Made" delay={0.7} top="55%" right="5%" />
          <FloatingStat value="99.9%" label="System Uptime" delay={1.0} bottom="18%" left="60%" top="auto" />
        </div>
      </div>

      {/* ─── Right Register Form ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div style={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                <path d="M8 20 Q12 14, 16 20 Q20 26, 24 20 Q28 14, 28 18" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ color: '#22d3ee', fontSize: '1.25rem', fontWeight: 700 }}>Resilience Lanka</span>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(56, 189, 248, 0.1)',
            borderRadius: '20px',
            padding: '36px 40px',
          }}>
            <div className="mb-6">
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9' }}>
                Create Account <span style={{ fontSize: '1.5rem' }}>✨</span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '8px' }}>
                Join the Resilience Lanka platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: '#fca5a5',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 6.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                    </svg>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" style={labelStyle}>Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>

              {/* Organization */}
              <div>
                <label htmlFor="reg-org" style={labelStyle}>
                  Organization <span style={{ color: '#64748b', textTransform: 'none', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="reg-org"
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  placeholder="e.g. DMC"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                      padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm" style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                      padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px' }}>
                  Minimum 6 characters
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading
                    ? 'rgba(6, 182, 212, 0.4)'
                    : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.3)',
                  marginTop: '4px',
                }}
                onMouseEnter={e => { if (!loading) e.target.style.boxShadow = '0 6px 30px rgba(6, 182, 212, 0.45)'; }}
                onMouseLeave={e => { if (!loading) e.target.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.3)'; }}
              >
                {loading ? <><Spinner /> Creating account...</> : 'Create Account'}
              </button>
            </form>

            {/* Login Link */}
            <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '0.85rem' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ color: '#22d3ee', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#67e8f9'}
                onMouseLeave={e => e.target.style.color = '#22d3ee'}
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p style={{
            textAlign: 'center', marginTop: '24px', color: '#475569',
            fontSize: '0.75rem', letterSpacing: '0.5px',
          }}>
            Powered by Machine Learning • Kaggle Hackathon 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
}
