import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/firestoreUtils';
import { User, Mail, Lock, Bell, Palette } from 'lucide-react';

const ProfileSettings = ({ highlightDisplayName = false }) => {
  const { currentUser, userProfile, updateUserEmail, updateUserPassword } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const displayNameInputRef = useRef(null);

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || ''
  });

  const isDisplayNameEmpty = !personalInfo.displayName || personalInfo.displayName.trim() === '';
  const showDisplayNameError = highlightDisplayName && isDisplayNameEmpty;

  // Email & Notifications
  const [email, setEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState({
    emailNotifications: userProfile?.emailNotifications !== false,
    sessionReminders: userProfile?.sessionReminders !== false,
    weeklyDigest: userProfile?.weeklyDigest !== false
  });

  // Display Preferences
  const [displayPrefs, setDisplayPrefs] = useState({
    theme: userProfile?.theme || 'system',
    language: userProfile?.language || 'en',
    dateFormat: userProfile?.dateFormat || 'MM/DD/YYYY'
  });

  const handleSavePersonalInfo = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateUserProfile(currentUser.uid, personalInfo);
      if (result.success) {
        setMessage({ type: 'success', text: 'Personal information updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update personal information' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update personal information' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email || email === currentUser.email) {
      setMessage({ type: 'info', text: 'No changes to save' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateUserEmail(email);
      if (result.success) {
        setMessage({ type: 'success', text: 'Email updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update email' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateUserPassword(newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateUserProfile(currentUser.uid, { ...notifications });
      if (result.success) {
        setMessage({ type: 'success', text: 'Notification preferences updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update notifications' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update notifications' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDisplayPrefs = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateUserProfile(currentUser.uid, { ...displayPrefs });
      if (result.success) {
        setMessage({ type: 'success', text: 'Display preferences updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update display preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update display preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-focus displayName input when highlighted
  useEffect(() => {
    if (highlightDisplayName && isDisplayNameEmpty && displayNameInputRef.current) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        displayNameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightDisplayName, isDisplayNameEmpty]);

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <Input
              ref={displayNameInputRef}
              id="displayName"
              value={personalInfo.displayName}
              onChange={(e) => setPersonalInfo({ ...personalInfo, displayName: e.target.value })}
              placeholder="Your full name"
              className={showDisplayNameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {showDisplayNameError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Please add your full name to help manage teams and track activity for auditing purposes.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={personalInfo.bio}
              onChange={(e) => setPersonalInfo({ ...personalInfo, bio: e.target.value })}
              placeholder="Tell us about yourself"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button onClick={handleSavePersonalInfo} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Email & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email & Notifications
          </CardTitle>
          <CardDescription>Manage your email and notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <Button onClick={handleUpdateEmail} disabled={isSaving} variant="outline">
              Update Email
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button onClick={handleUpdatePassword} disabled={isSaving} variant="outline">
              Update Password
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailNotifications}
                onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminders for upcoming sessions</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.sessionReminders}
                onChange={(e) => setNotifications({ ...notifications, sessionReminders: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">Receive a weekly summary of your research</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.weeklyDigest}
                onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              Save Notification Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              value={displayPrefs.theme}
              onChange={(e) => setDisplayPrefs({ ...displayPrefs, theme: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={displayPrefs.language}
              onChange={(e) => setDisplayPrefs({ ...displayPrefs, language: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <select
              id="dateFormat"
              value={displayPrefs.dateFormat}
              onChange={(e) => setDisplayPrefs({ ...displayPrefs, dateFormat: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <Button onClick={handleSaveDisplayPrefs} disabled={isSaving}>
            Save Display Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;

