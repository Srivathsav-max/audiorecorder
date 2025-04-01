'use client';

import React, { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, AlertCircle, Save, Settings } from 'lucide-react';

interface AppSettingsData {
  registrationEnabled: boolean;
  backendUrl: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Track changes to settings
  useEffect(() => {
    if (settings) {
      const hasChanged = registrationEnabled !== settings.registrationEnabled ||
                        backendUrl !== settings.backendUrl;
      setHasChanges(hasChanged);
    }
  }, [settings, registrationEnabled, backendUrl]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch application settings');
      }

      const data = await response.json();
      setSettings(data);
      setRegistrationEnabled(data.registrationEnabled);
      setBackendUrl(data.backendUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setSuccess(null);
      setError(null);
      
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationEnabled,
          backendUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings(data);
      setSuccess('Settings updated successfully');
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    if (settings) {
      setRegistrationEnabled(settings.registrationEnabled);
      setBackendUrl(settings.backendUrl);
      setHasChanges(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Configure system-wide settings for the audio recording platform
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center p-4">Loading settings...</div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="space-y-6">
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-4 rounded-lg flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>{success}</span>
                </div>
              )}
              
              <div className="space-y-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">User Registration</h3>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="registration-toggle" className="text-base">
                          Allow New User Registration
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {registrationEnabled 
                            ? 'New users can self-register on the platform' 
                            : 'New users cannot register - only admins can create accounts'}
                        </p>
                      </div>
                      <Switch
                        id="registration-toggle"
                        checked={registrationEnabled}
                        onCheckedChange={setRegistrationEnabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Backend Service</h3>
                    
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="space-y-1">
                        <Label htmlFor="backend-url" className="text-base">
                          Backend API URL
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          The URL of the Speech2Transcript microservice (e.g., ngrok URL for port forwarding)
                        </p>
                      </div>
                      <input
                        id="backend-url"
                        type="url"
                        value={backendUrl}
                        onChange={(e) => setBackendUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm ring-offset-background"
                        placeholder="https://your-ngrok-url.ngrok.io"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={resetChanges}
            disabled={!hasChanges || loading || saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={!hasChanges || loading || saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
