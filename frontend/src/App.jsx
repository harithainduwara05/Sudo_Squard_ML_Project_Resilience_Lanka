import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

/**
 * Default route handler:
 * - Admin → /admin page
 * - Normal user → User Mode dashboard (map-based)
 */
function DashboardRoute() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <UserDashboardPage />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Default: User Mode (for normal users) or Admin redirect */}
      <Route path="/" element={
        <ProtectedRoute>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
            <DashboardRoute />
          </main>
        </ProtectedRoute>
      } />

      {/* Advanced Mode (full parameter form) */}
      <Route path="/advanced" element={
        <ProtectedRoute>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
            <DashboardPage />
          </main>
        </ProtectedRoute>
      } />

      {/* Keep /user as redirect for backward compat */}
      <Route path="/user" element={<Navigate to="/" replace />} />

      {/* Analytics */}
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
            <AnalyticsPage />
          </main>
        </ProtectedRoute>
      } />

      {/* Profile */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
            <ProfilePage />
          </main>
        </ProtectedRoute>
      } />

      {/* Admin Dashboard */}
      <Route path="/admin" element={
        <AdminRoute>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
            <AdminPage />
          </main>
        </AdminRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-bg-deep">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
