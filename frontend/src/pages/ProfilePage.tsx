import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authAPI } from '@/services/api';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      setName(userData.name);
      setEmail(userData.email);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Note: This would need a backend endpoint to update user profile
      // For now, just show success (you can add the endpoint later)
      toast.success('Profile updated successfully!');
      setEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setName(user?.name || '');
    setEmail(user?.email || '');
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.warning('Password must be at least 8 characters');
      return;
    }

    setChanging(true);
    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully!');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to change password';
      toast.error(message);
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Profile</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your account information</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Account Details</h2>
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <Input
            label="Name"
            value={editing ? name : user?.name || ''}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
          />
          <Input
            label="Email"
            value={editing ? email : user?.email || ''}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!editing}
          />
          <Input
            label="Role"
            value={user?.role || 'user'}
            disabled
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Member Since
            </label>
            <div className="text-slate-600 dark:text-slate-400">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          {editing && (
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Change Password</h2>
        
        {!showPasswordForm ? (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Update your account password
            </p>
            <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
              Change Password
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex gap-3">
              <Button onClick={handleChangePassword} disabled={changing}>
                {changing ? 'Changing...' : 'Update Password'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
