import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NavigationHeader from '@/components/NavigationHeader';
import { LogOut, Check } from 'lucide-react';

const ProfilePage = () => {
  const { currentUser, userProfile, updateUserEmail, updateUserPassword, signout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess(false);
    setEmailLoading(true);

    if (email === currentUser?.email) {
      setEmailError('This is already your current email');
      setEmailLoading(false);
      return;
    }

    const result = await updateUserEmail(email);
    setEmailLoading(false);

    if (result.success) {
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } else {
      setEmailError(result.error || 'Failed to update email');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    const result = await updateUserPassword(newPassword);
    setPasswordLoading(false);

    if (result.success) {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError(result.error || 'Failed to update password');
    }
  };

  const handleSignOut = async () => {
    await signout();
    navigate('/login');
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader currentView="profile" onNavigate={() => navigate('/')} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground">{currentUser?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-foreground capitalize">{userProfile?.role || 'researcher'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Update Email Card */}
          <Card>
            <CardHeader>
              <CardTitle>Update Email</CardTitle>
              <CardDescription>Change your account email address</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                {emailError && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                    {emailError}
                  </div>
                )}
                {emailSuccess && (
                  <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Email updated successfully
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="newEmail" className="text-sm font-medium">
                    New Email
                  </label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="new@example.com"
                    required
                    disabled={emailLoading}
                  />
                </div>
                <Button type="submit" disabled={emailLoading}>
                  {emailLoading ? 'Updating...' : 'Update Email'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Update Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {passwordError && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Password updated successfully
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={passwordLoading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmNewPassword" className="text-sm font-medium">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={passwordLoading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sign Out Card */}
          <Card>
            <CardHeader>
              <CardTitle>Sign Out</CardTitle>
              <CardDescription>Sign out of your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

