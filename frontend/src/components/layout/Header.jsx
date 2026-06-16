import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Extract first name for display
  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const avatarLetter = firstName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                <defs>
                  <linearGradient id="wave-grad" x1="0" y1="0" x2="36" y2="36">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <circle cx="18" cy="18" r="17" stroke="url(#wave-grad)" strokeWidth="2" fill="rgba(6, 182, 212, 0.1)" />
                <path d="M8 20 Q12 14, 16 20 Q20 26, 24 20 Q28 14, 28 18" stroke="url(#wave-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M8 16 Q12 10, 16 16 Q20 22, 24 16" stroke="url(#wave-grad)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
              </svg>
              <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2), transparent 70%)' }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span style={{ color: '#22d3ee' }}>Resilience</span>
                <span className="text-text-secondary font-light ml-1">Lanka</span>
              </h1>
              <p className="text-[10px] text-text-muted tracking-widest uppercase -mt-0.5">Flood Risk Analytics</p>
            </div>
          </NavLink>

          {/* Navigation + User */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-primary-light bg-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 2h5v6H2V2zm7 0h5v4H9V2zM2 10h5v4H2v-4zm7-2h5v6H9V8z" opacity="0.9"/>
                  </svg>
                  Dashboard
                </span>
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-primary-light bg-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 14V8h3v6H2zm4.5 0V2h3v12h-3zM11 14V5h3v9h-3z" opacity="0.9"/>
                  </svg>
                  Analytics
                </span>
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'text-primary-light bg-primary/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1l5 2v4c0 3.2-2 6.1-5 8-3-1.9-5-4.8-5-8V3l5-2zm0 2.2L5 4.4V7c0 2.1 1.1 4.2 3 5.6 1.9-1.4 3-3.5 3-5.6V4.4L8 3.2z" opacity="0.9" />
                    </svg>
                    Admin
                  </span>
                </NavLink>
              )}
            </nav>

            {/* Divider */}
            <div style={{
              width: '1px', height: '28px',
              background: 'rgba(56, 189, 248, 0.12)',
            }} />

            {/* User Section */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-2">
                <div style={{
                  width: 32, height: 32, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700, color: 'white',
                  flexShrink: 0,
                }}>
                  {avatarLetter}
                </div>
                <span className="hidden sm:block text-sm font-medium text-text-primary" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {firstName}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300"
                style={{
                  color: '#94a3b8',
                  background: 'transparent',
                  border: '1px solid rgba(56, 189, 248, 0.1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.color = '#fca5a5';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.1)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
