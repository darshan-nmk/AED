import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [timeout, setTimeout] = useState(3600);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/v1/settings/me');
      setWorkspaceName(response.data.workspace_name);
      setTimeout(response.data.pipeline_timeout);
      setEmailNotifications(response.data.email_notifications);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/settings/me', {
        workspace_name: workspaceName,
        pipeline_timeout: timeout,
        email_notifications: emailNotifications,
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Configure your workspace and preferences</p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Workspace Name
            </label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Pipeline Timeout
            </label>
            <Input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value))}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Time in seconds before a pipeline run times out</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Notifications</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="rounded" 
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Email notifications enabled</span>
          </label>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
