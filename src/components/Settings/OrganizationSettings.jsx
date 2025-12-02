import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateOrganization } from '@/lib/firestoreUtils';
import { isSubdomainAvailable } from '@/lib/firestoreUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const OrganizationSettings = () => {
  const { currentUser, userOrganization, isAdmin, refreshUserProfile } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [orgSubdomain, setOrgSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Refs for debouncing and race condition handling
  const debounceTimerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  // Initialize form with current organization data
  useEffect(() => {
    if (userOrganization) {
      setOrgName(userOrganization.name || '');
      setOrgSubdomain(userOrganization.subdomain || '');
    }
  }, [userOrganization]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced subdomain availability check
  const validateSubdomainDebounced = useCallback(async (value, requestId) => {
    // Only process if this is still the latest request
    if (requestId !== latestRequestIdRef.current) {
      return; // Ignore outdated requests
    }

    setCheckingSubdomain(true);
    setSubdomainError('');

    try {
      const available = await isSubdomainAvailable(value);
      
      // Double-check this is still the latest request
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      if (!available) {
        setSubdomainError('This subdomain is already taken');
      } else {
        setSubdomainError('');
      }
    } catch (error) {
      // Only set error if this is still the latest request
      if (requestId === latestRequestIdRef.current) {
        console.error('Error checking subdomain:', error);
        const errorMessage = error.message || 'Error checking subdomain availability';
        if (errorMessage.includes('Subdomain')) {
          setSubdomainError(errorMessage);
        } else {
          setSubdomainError('Unable to check subdomain availability. Please try again.');
        }
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setCheckingSubdomain(false);
      }
    }
  }, []);

  // Handle subdomain input changes with debouncing
  const handleSubdomainChange = useCallback((value) => {
    setOrgSubdomain(value);
    setSubdomainError(''); // Clear errors immediately when typing
    setSuccessMessage('');

    // Cancel previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If empty, clear errors and return
    if (!value || value.trim() === '') {
      return;
    }

    const normalized = value.toLowerCase().trim();

    // Immediate client-side validation (no debounce)
    if (normalized.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(normalized)) {
      setSubdomainError('Subdomain can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    if (normalized.startsWith('-') || normalized.endsWith('-')) {
      setSubdomainError('Subdomain cannot start or end with a hyphen');
      return;
    }

    // If subdomain hasn't changed, don't check availability
    if (normalized === userOrganization?.subdomain?.toLowerCase()) {
      setSubdomainError('');
      return;
    }

    // Increment request ID for race condition handling
    latestRequestIdRef.current += 1;
    const currentRequestId = latestRequestIdRef.current;

    // Debounce API call (500ms after user stops typing)
    debounceTimerRef.current = setTimeout(() => {
      validateSubdomainDebounced(normalized, currentRequestId);
    }, 500);
  }, [userOrganization, validateSubdomainDebounced]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    // If subdomain is provided, validate it
    if (orgSubdomain && orgSubdomain.trim()) {
      const normalized = orgSubdomain.toLowerCase().trim();
      if (normalized.length < 3) {
        setError('Subdomain must be at least 3 characters');
        return;
      }
      if (subdomainError) {
        setError('Please fix the subdomain error before saving');
        return;
      }
    }

    setLoading(true);

    try {
      const updates = {
        name: orgName.trim()
      };

      // Only update subdomain if it's different from current
      const currentSubdomain = userOrganization?.subdomain?.toLowerCase() || '';
      const newSubdomain = orgSubdomain.trim().toLowerCase();
      if (newSubdomain && newSubdomain !== currentSubdomain) {
        updates.subdomain = newSubdomain;
      } else if (!newSubdomain && currentSubdomain) {
        // If user cleared subdomain, set to null
        updates.subdomain = null;
      }

      const result = await updateOrganization(userOrganization.id, updates, currentUser.uid);

      if (result.success) {
        setSuccessMessage('Organization settings updated successfully');
        // Refresh user profile to get updated organization data
        await refreshUserProfile();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(result.error || 'Failed to update organization settings');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      setError(error.message || 'Failed to update organization settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin() || !userOrganization) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            You need to be an admin to manage organization settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Manage your organization's name and subdomain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corporation"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgSubdomain">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="orgSubdomain"
                type="text"
                value={orgSubdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="acme"
                disabled={loading}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">.yourdomain.com</span>
            </div>
            {checkingSubdomain && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking availability...
              </div>
            )}
            {subdomainError && (
              <div className="text-sm text-red-500">{subdomainError}</div>
            )}
            {orgSubdomain && !subdomainError && !checkingSubdomain && orgSubdomain.toLowerCase() !== userOrganization?.subdomain?.toLowerCase() && (
              <div className="text-sm text-green-600">Subdomain available!</div>
            )}
            <p className="text-xs text-muted-foreground">
              Leave blank to remove subdomain. Used for organization lookup.
            </p>
          </div>

          <Button type="submit" disabled={loading || !!subdomainError}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OrganizationSettings;
