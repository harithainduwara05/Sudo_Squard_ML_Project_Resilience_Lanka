import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminOverview,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../api/client';

const roles = ['officer', 'researcher', 'admin'];

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({ label, value, accent, helper }) {
  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">
        {label}
      </p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      {helper && <p className="text-xs text-text-muted mt-2">{helper}</p>}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="glass-card p-8 text-center text-sm text-text-muted">
      {children}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);

  const feedback = overview?.feedback || {};
  const recentIssues = feedback.recent_inaccurate_feedback || [];

  const filteredUsers = useMemo(() => users, [users]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setLoading(true);
      setError('');
      try {
        const [overviewData, usersData] = await Promise.all([
          getAdminOverview(),
          getAdminUsers(search.trim()),
        ]);
        if (!cancelled) {
          setOverview(overviewData);
          setUsers(usersData.users || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(typeof err.detail === 'string' ? err.detail : 'Unable to load admin dashboard.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timer = setTimeout(loadAdminData, search.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const updateUserInList = (updatedUser) => {
    setUsers((current) =>
      current.map((item) => (item.id === updatedUser.id ? updatedUser : item))
    );
  };

  const handleRoleChange = async (targetUser, role) => {
    setSavingUserId(targetUser.id);
    setError('');
    try {
      const updated = await updateAdminUserRole(targetUser.id, role);
      updateUserInList(updated);
    } catch (err) {
      setError(typeof err.detail === 'string' ? err.detail : 'Unable to update role.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleStatusChange = async (targetUser) => {
    setSavingUserId(targetUser.id);
    setError('');
    try {
      const updated = await updateAdminUserStatus(targetUser.id, !targetUser.is_active);
      updateUserInList(updated);
    } catch (err) {
      setError(typeof err.detail === 'string' ? err.detail : 'Unable to update account status.');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent">
              Admin
            </span>
            <span className="text-text-primary"> Dashboard</span>
          </h2>
          <p className="text-text-muted text-sm max-w-2xl">
            Manage access, monitor system usage, and review model accuracy signals.
          </p>
        </div>
        <div className="glass-card px-4 py-3">
          <p className="text-xs text-text-muted uppercase tracking-wider">Signed in as</p>
          <p className="text-sm font-semibold text-text-primary">{user?.full_name || user?.email}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl glass-card border-risk-medium/30 text-sm text-risk-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active Users"
            value={`${formatNumber(overview?.active_users)} / ${formatNumber(overview?.total_users)}`}
            accent="#06b6d4"
            helper={`${formatNumber(overview?.admin_users)} active admins`}
          />
          <StatCard
            label="Total Predictions"
            value={formatNumber(overview?.total_predictions)}
            accent="#3b82f6"
            helper={`${formatNumber(overview?.high_risk_count)} high-risk alerts`}
          />
          <StatCard
            label="Avg Risk Score"
            value={Number(overview?.avg_risk_score || 0).toFixed(3)}
            accent="#f59e0b"
            helper="Across logged predictions"
          />
          <StatCard
            label="Feedback Accuracy"
            value={`${Number(feedback.feedback_accuracy || 0).toFixed(1)}%`}
            accent="#10b981"
            helper={`${formatNumber(feedback.total_feedback)} feedback records`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 glass-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Users</h3>
              <p className="text-xs text-text-muted mt-1">Role changes and account status updates are applied immediately.</p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="w-full sm:w-64 px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState>No users found.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-muted border-b border-border-subtle">
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 px-4 font-medium">Role</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Created</th>
                    <th className="py-3 pl-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const isCurrentUser = item.id === user?.id;
                    const isSaving = savingUserId === item.id;
                    return (
                      <tr key={item.id} className="border-b border-border-subtle/70 last:border-0">
                        <td className="py-4 pr-4 min-w-60">
                          <p className="font-semibold text-text-primary">{item.full_name}</p>
                          <p className="text-xs text-text-muted">{item.email}</p>
                          {item.organization && (
                            <p className="text-xs text-primary-light mt-1">{item.organization}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={item.role}
                            disabled={isSaving || (isCurrentUser && item.role === 'admin')}
                            onChange={(event) => handleRoleChange(item, event.target.value)}
                            className="min-w-32"
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.is_active
                                ? 'bg-risk-low/10 text-risk-low'
                                : 'bg-risk-high/10 text-risk-high'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-text-secondary whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <button
                            type="button"
                            disabled={isSaving || isCurrentUser}
                            onClick={() => handleStatusChange(item)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                              item.is_active
                                ? 'text-risk-high border border-risk-high/30 hover:bg-risk-high/10'
                                : 'text-risk-low border border-risk-low/30 hover:bg-risk-low/10'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass-card p-5">
          <h3 className="text-lg font-semibold text-text-primary">Inaccurate Feedback</h3>
          <p className="text-xs text-text-muted mt-1 mb-5">
            Recent records marked inaccurate by users.
          </p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : recentIssues.length === 0 ? (
            <EmptyState>No inaccurate feedback yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {recentIssues.map((item) => (
                <div key={item.feedback_id} className="rounded-xl border border-border-subtle bg-bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-primary-light">
                      {item.prediction_id}
                    </p>
                    <span className="text-[11px] text-text-muted whitespace-nowrap">
                      {formatDate(item.created_at || item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-3">
                    {item.comment || 'No comment provided.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
