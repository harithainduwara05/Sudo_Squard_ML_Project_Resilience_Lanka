import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../api/client';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg(''); setProfileErr('');
    if (fullName.trim().length < 2) { setProfileErr('Name must be at least 2 characters.'); return; }
    setProfileLoading(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        organization: organization.trim() || null,
      });
      updateUser(updated);
      setProfileMsg('Profile updated successfully!');
    } catch (err) {
      setProfileErr(typeof err.detail === 'string' ? err.detail : 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg(''); setPassErr('');
    if (newPassword.length < 8) { setPassErr('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPassErr('Passwords do not match.'); return; }
    setPassLoading(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPassMsg('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPassErr(typeof err.detail === 'string' ? err.detail : 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border-subtle text-sm text-text-primary outline-none focus:border-primary transition-colors';
  const labelClass = 'block text-xs text-text-muted uppercase tracking-wider font-medium mb-2';
  const btnClass = 'w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent">
            My
          </span>
          <span className="text-text-primary"> Profile</span>
        </h2>
        <p className="text-text-muted text-sm">
          Update your personal information and manage your account settings.
        </p>
      </div>

      {/* User Info Card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, color: 'white',
          }}>
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{user?.full_name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: user?.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(6,182,212,0.15)',
                color: user?.role === 'admin' ? '#f59e0b' : '#06b6d4',
              }}>
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Update Form */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">Personal Information</h3>
        <p className="text-xs text-text-muted mb-5">Update your name and organization details.</p>

        {profileMsg && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            ✅ {profileMsg}
          </div>
        )}
        {profileErr && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {profileErr}
          </div>
        )}

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" value={user?.email || ''} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
            <p className="text-xs text-text-muted mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <label className={labelClass}>Organization</label>
            <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Optional" className={inputClass} />
          </div>
          <button type="submit" disabled={profileLoading} className={btnClass}
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white', border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer' }}>
            {profileLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">Change Password</h3>
        <p className="text-xs text-text-muted mb-5">Ensure your account uses a strong password (min 8 characters).</p>

        {passMsg && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            ✅ {passMsg}
          </div>
        )}
        {passErr && (
          <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {passErr}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Min 8 characters" />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={passLoading} className={btnClass}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', border: 'none', cursor: passLoading ? 'not-allowed' : 'pointer' }}>
            {passLoading ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
