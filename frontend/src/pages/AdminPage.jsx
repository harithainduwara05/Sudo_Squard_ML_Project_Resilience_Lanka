import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteAdminUser,
  getAdminOverview,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from '../api/client';

const roles = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

const riskColors = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

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

function BarList({ items, valueKey, labelKey = 'district', color = '#06b6d4', emptyText }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 0);

  if (items.length === 0 || maxValue === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const width = maxValue ? Math.max(8, (value / maxValue) * 100) : 0;
        return (
          <div key={item[labelKey]}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-medium text-text-primary">{item[labelKey]}</span>
              <span className="text-xs text-text-muted tabular-nums">
                {valueKey.includes('score') ? value.toFixed(3) : formatNumber(value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RiskDistribution({ distribution }) {
  const entries = ['low', 'medium', 'high', 'critical'].map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: Number(distribution?.[key] || 0),
  }));
  const total = entries.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return <EmptyState>No risk distribution data yet.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 rounded-full overflow-hidden bg-bg-elevated">
        {entries.map((item) => (
          <div
            key={item.key}
            style={{
              width: `${(item.value / total) * 100}%`,
              background: riskColors[item.key],
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entries.map((item) => (
          <div key={item.key} className="rounded-lg border border-border-subtle bg-bg-card/60 p-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: riskColors[item.key] }}
              />
              <span className="text-xs text-text-muted">{item.label}</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-text-primary">{formatNumber(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ title, subtitle, children }) {
  return (
    <section className="glass-card p-5">
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <p className="text-xs text-text-muted mt-1 mb-5">{subtitle}</p>
      {children}
    </section>
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
  const riskInsights = overview?.risk_insights || {};
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

  const handleDeleteUser = async (targetUser) => {
    const confirmed = window.confirm(
      `Delete ${targetUser.full_name}? This permanently removes the account.`
    );
    if (!confirmed) return;

    setSavingUserId(targetUser.id);
    setError('');
    try {
      await deleteAdminUser(targetUser.id);
      setUsers((current) => current.filter((item) => item.id !== targetUser.id));
    } catch (err) {
      setError(typeof err.detail === 'string' ? err.detail : 'Unable to delete user.');
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

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <InsightCard
            title="High-Risk Areas"
            subtitle="Districts with recent high-risk predictions."
          >
            <BarList
              items={riskInsights.high_risk_areas || []}
              valueKey="max_score"
              color="#ef4444"
              emptyText="No high-risk areas recorded yet."
            />
          </InsightCard>

          <InsightCard
            title="24h Risk Watchlist"
            subtitle="Projected from recent prediction patterns."
          >
            <BarList
              items={riskInsights.risk_watchlist_24h || []}
              valueKey="projected_score"
              color="#f59e0b"
              emptyText="No districts currently need 24h watchlist attention."
            />
          </InsightCard>

          <InsightCard
            title="Risk Distribution"
            subtitle="Logged predictions by risk category."
          >
            <RiskDistribution distribution={riskInsights.risk_distribution || {}} />
          </InsightCard>
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
                    <th className="py-3 pl-4 font-medium text-right">Actions</th>
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
                            className="min-w-32 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-primary/50 outline-none hover:bg-white/10 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto', paddingRight: '2rem' }}
                          >
                            {roles.map((role) => (
                              <option key={role.value} value={role.value} className="bg-slate-900 text-text-primary">
                                {role.label}
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
                          <div className="flex flex-wrap items-center justify-end gap-2 min-w-[160px]">
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
                            <button
                              type="button"
                              disabled={isSaving || isCurrentUser}
                              onClick={() => handleDeleteUser(item)}
                              className="px-3 py-2 rounded-lg text-xs font-semibold text-risk-high border border-risk-high/30 transition-colors hover:bg-risk-high/10 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>
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
