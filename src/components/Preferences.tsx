import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Settings, 
  Bell, 
  Download, 
  Monitor, 
  Shield,
  Clock,
  Mail,
  FileText,
  Eye,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserPreferences {
  daily_reminder_time: string;
  daily_reminder_enabled: boolean;
  email_notifications: {
    streaks: boolean;
    milestones: boolean;
    reminders: boolean;
    weekly_summary: boolean;
  };
  journal_export: {
    format: string;
    include_quotes: boolean;
    include_challenges: boolean;
  };
  display: {
    theme: string;
    show_streak_counter: boolean;
    show_progress_percentage: boolean;
  };
  privacy: {
    data_sharing: boolean;
    analytics: boolean;
  };
}

export default function Preferences({ open, onOpenChange }: PreferencesProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);

  // Fetch preferences when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchPreferences();
    }
  }, [open, user]);

  const fetchPreferences = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const { supabase } = await import('../utils/supabase/client');
      
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || publicAnonKey;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/user/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPreferences(result.preferences);
        setInitialPreferences(result.preferences);
      } else {
        console.error('Failed to fetch preferences');
        toast.error('Failed to load preferences');
      }
    } catch (error) {
      console.error('Preferences fetch error:', error);
      toast.error('Failed to load preferences');
    }
  };

  const handlePreferenceChange = (path: string, value: any) => {
    setPreferences(prev => {
      if (!prev) return prev;
      
      const keys = path.split('.');
      const newPreferences = { ...prev };
      let current: any = newPreferences;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPreferences;
    });
  };

  const hasChanges = () => {
    return JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      setLoading(true);

      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const { supabase } = await import('../utils/supabase/client');
      
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || publicAnonKey;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/user/preferences`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(preferences),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Preferences saved successfully');
        setInitialPreferences(preferences);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Preferences save error:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreferences(initialPreferences);
  };

  if (!preferences) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" aria-describedby="loading-description">
          <DialogHeader>
            <DialogTitle id="loading-title" className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Loading Preferences
            </DialogTitle>
            <DialogDescription id="loading-description">Please wait while we load your preferences.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading preferences...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="preferences-description">
        <DialogHeader>
          <DialogTitle id="preferences-title" className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </DialogTitle>
          <DialogDescription id="preferences-description">
            Customize your Stoic AF experience and notification settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Daily Reminders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Daily Reminders
              </CardTitle>
              <CardDescription>
                Get reminded to complete your daily journal entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reminder-enabled">Enable daily reminders</Label>
                <Switch
                  id="reminder-enabled"
                  checked={preferences.daily_reminder_enabled}
                  onCheckedChange={(checked) => handlePreferenceChange('daily_reminder_enabled', checked)}
                />
              </div>
              
              {preferences.daily_reminder_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Reminder time</Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    value={preferences.daily_reminder_time}
                    onChange={(e) => handlePreferenceChange('daily_reminder_time', e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which email notifications you'd like to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-streaks">Streak achievements</Label>
                  <p className="text-xs text-muted-foreground">Celebrate your journaling streaks</p>
                </div>
                <Switch
                  id="email-streaks"
                  checked={preferences.email_notifications.streaks}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications.streaks', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-milestones">Track milestones</Label>
                  <p className="text-xs text-muted-foreground">Day 7, 15, and 30 achievements</p>
                </div>
                <Switch
                  id="email-milestones"
                  checked={preferences.email_notifications.milestones}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications.milestones', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-reminders">Daily reminders</Label>
                  <p className="text-xs text-muted-foreground">Gentle nudges to keep journaling</p>
                </div>
                <Switch
                  id="email-reminders"
                  checked={preferences.email_notifications.reminders}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications.reminders', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-summary">Weekly summaries</Label>
                  <p className="text-xs text-muted-foreground">Your progress and insights recap</p>
                </div>
                <Switch
                  id="email-summary"
                  checked={preferences.email_notifications.weekly_summary}
                  onCheckedChange={(checked) => handlePreferenceChange('email_notifications.weekly_summary', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Journal Export */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" />
                Journal Export
              </CardTitle>
              <CardDescription>
                Customize how your journal entries are exported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">Export format</Label>
                <Select
                  value={preferences.journal_export.format}
                  onValueChange={(value) => handlePreferenceChange('journal_export.format', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="txt">Text</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-quotes">Include daily quotes</Label>
                <Switch
                  id="include-quotes"
                  checked={preferences.journal_export.include_quotes}
                  onCheckedChange={(checked) => handlePreferenceChange('journal_export.include_quotes', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-challenges">Include daily challenges</Label>
                <Switch
                  id="include-challenges"
                  checked={preferences.journal_export.include_challenges}
                  onCheckedChange={(checked) => handlePreferenceChange('journal_export.include_challenges', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4" />
                Display Settings
              </CardTitle>
              <CardDescription>
                Customize how information is displayed in your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.display.theme}
                  onValueChange={(value) => handlePreferenceChange('display.theme', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-streak">Show streak counter</Label>
                <Switch
                  id="show-streak"
                  checked={preferences.display.show_streak_counter}
                  onCheckedChange={(checked) => handlePreferenceChange('display.show_streak_counter', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-progress">Show progress percentage</Label>
                <Switch
                  id="show-progress"
                  checked={preferences.display.show_progress_percentage}
                  onCheckedChange={(checked) => handlePreferenceChange('display.show_progress_percentage', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control how your data is used and shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-sharing">Allow data sharing</Label>
                  <p className="text-xs text-muted-foreground">Help improve the app with anonymous usage data</p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={preferences.privacy.data_sharing}
                  onCheckedChange={(checked) => handlePreferenceChange('privacy.data_sharing', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics">Usage analytics</Label>
                  <p className="text-xs text-muted-foreground">Help us understand how the app is used</p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.privacy.analytics}
                  onCheckedChange={(checked) => handlePreferenceChange('privacy.analytics', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          
          {hasChanges() && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}