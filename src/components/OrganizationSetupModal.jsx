import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getOrganizationBySubdomain, 
  isSubdomainAvailable, 
  createOrganization,
  createJoinRequest,
  createWorkspace,
  getRequestsByUser
} from '@/lib/firestoreUtils';
import { getOrganizationById } from '@/lib/firestoreUtils';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Building2, Users, Loader2 } from 'lucide-react';

// Helper function to generate subdomain from organization name (same as in organizations.js)
const generateSubdomain = (name) => {
  if (!name) return null;
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
};

const OrganizationSetupModal = () => {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [orgOption, setOrgOption] = useState('create'); // 'create' or 'join'
  const [orgName, setOrgName] = useState('');
  const [generatedSubdomain, setGeneratedSubdomain] = useState('');
  const [joinSubdomain, setJoinSubdomain] = useState('');
  const [foundOrganization, setFoundOrganization] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [pendingOrgId, setPendingOrgId] = useState(null);
  const [pendingOrgName, setPendingOrgName] = useState('');

  // Check for existing pending requests on mount
  useEffect(() => {
    const checkPendingRequests = async () => {
      if (!currentUser) return;
      
      try {
        const requests = await getRequestsByUser(currentUser.uid);
        const pending = requests.find(r => r.status === 'pending');
        if (pending) {
          setPendingRequest(true);
          setPendingOrgId(pending.organizationId);
          // Fetch organization name
          const org = await getOrganizationById(pending.organizationId);
          if (org) {
            setPendingOrgName(org.name);
          }
        }
      } catch (error) {
        console.error('Error checking pending requests:', error);
      }
    };

    checkPendingRequests();
  }, [currentUser]);

  // Auto-generate subdomain when organization name changes
  useEffect(() => {
    if (orgOption === 'create' && orgName.trim()) {
      const generated = generateSubdomain(orgName);
      setGeneratedSubdomain(generated || '');
    } else {
      setGeneratedSubdomain('');
    }
  }, [orgName, orgOption]);

  // Handle organization subdomain lookup for joining
  const handleSubdomainLookup = async (subdomain) => {
    if (!subdomain || subdomain.length < 3) {
      setFoundOrganization(null);
      setSubdomainError('');
      return;
    }

    setCheckingSubdomain(true);
    setSubdomainError('');
    
    try {
      const normalizedSubdomain = subdomain.toLowerCase().trim();
      const org = await getOrganizationBySubdomain(normalizedSubdomain);
      
      if (org) {
        setFoundOrganization(org);
        setSubdomainError('');
      } else {
        setFoundOrganization(null);
        setSubdomainError('Organization not found. Please check the subdomain and try again.');
      }
    } catch (error) {
      console.error('Error looking up organization:', error);
      setFoundOrganization(null);
      setSubdomainError('Error looking up organization. Please try again.');
    } finally {
      setCheckingSubdomain(false);
    }
  };

  // Handle subdomain input for joining
  const handleJoinSubdomainChange = (value) => {
    setJoinSubdomain(value);
    handleSubdomainLookup(value);
  };

  // Validate generated subdomain availability
  const validateGeneratedSubdomain = async () => {
    if (!generatedSubdomain || generatedSubdomain.length < 3) {
      return true; // Will be handled by auto-generation logic
    }

    setCheckingSubdomain(true);
    setSubdomainError('');
    
    try {
      const available = await isSubdomainAvailable(generatedSubdomain);
      if (!available) {
        setSubdomainError('This subdomain is already taken. A variation will be generated.');
      } else {
        setSubdomainError('');
      }
      return available;
    } catch (error) {
      console.error('Error checking subdomain:', error);
      const errorMessage = error.message || 'Error checking subdomain availability';
      if (errorMessage.includes('Subdomain')) {
        setSubdomainError(errorMessage);
      } else {
        setSubdomainError('Unable to check subdomain availability. Please try again.');
      }
      return false;
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      // Ensure user profile exists with role: 'member' before creating organization
      // This is required for security rules that check isMember()
      const userProfileRef = doc(db, 'users', currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      if (!userProfileSnap.exists() || !userProfileSnap.data().role) {
        await setDoc(userProfileRef, {
          email: currentUser.email,
          role: 'member',
          is_admin: false,
          organizationId: null,
          workspaceIds: [],
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Create organization with auto-generated subdomain
      const orgResult = await createOrganization(
        {
          name: orgName.trim(),
          subdomain: null, // Let createOrganization auto-generate
          tier: 'small_team',
          workspaceLimit: 1
        },
        currentUser.uid
      );

      if (!orgResult.success) {
        setError(orgResult.error || 'Failed to create organization');
        setLoading(false);
        return;
      }

      // Small delay to ensure organization document is fully written
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create default workspace
      const workspaceResult = await createWorkspace(
        {
          name: 'Default Workspace',
          description: 'Default workspace for your organization'
        },
        currentUser.uid,
        orgResult.id
      );

      // Update user profile with organization and workspace, set as admin
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          organizationId: orgResult.id,
          workspaceIds: workspaceResult.success ? [workspaceResult.id] : [],
          is_admin: true, // User is admin of their own organization
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Refresh user profile to update context
      await refreshUserProfile();
    } catch (error) {
      console.error('Error creating organization:', error);
      setError(error.message || 'Failed to create organization');
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e) => {
    e.preventDefault();
    setError('');

    if (!joinSubdomain.trim()) {
      setError('Please enter an organization subdomain');
      return;
    }

    if (!foundOrganization) {
      setError('Please verify the organization exists before continuing');
      return;
    }

    setLoading(true);

    try {
      const requestResult = await createJoinRequest(
        foundOrganization.id,
        currentUser.uid,
        currentUser.email
      );

      if (!requestResult.success) {
        setError(requestResult.error || 'Failed to create join request');
        setLoading(false);
        return;
      }

      // Show pending request message
      setPendingRequest(true);
      setPendingOrgId(foundOrganization.id);
      setPendingOrgName(foundOrganization.name);
      setError('');
      setLoading(false);
    } catch (error) {
      console.error('Error creating join request:', error);
      setError(error.message || 'Failed to create join request');
      setLoading(false);
    }
  };

  // Don't show modal if user already has an organization
  if (userProfile?.organizationId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Organization Setup</CardTitle>
          <CardDescription>
            {pendingRequest
              ? 'Your request to join has been sent. An admin will review it shortly.'
              : 'You need to create or join an organization to continue'}
          </CardDescription>
        </CardHeader>
        
        {pendingRequest ? (
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Request Pending
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Your request to join <strong>{pendingOrgName || foundOrganization?.name || 'the organization'}</strong> has been sent. 
                You'll be notified once an admin approves your request.
              </div>
            </div>
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
              
              {/* Organization option selection */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOrgOption('create');
                      setError('');
                      setSubdomainError('');
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      orgOption === 'create'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mb-2" />
                    <div className="font-medium">Create New</div>
                    <div className="text-sm text-muted-foreground">Start your own organization</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrgOption('join');
                      setError('');
                      setSubdomainError('');
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      orgOption === 'join'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Users className="w-5 h-5 mb-2" />
                    <div className="font-medium">Join Existing</div>
                    <div className="text-sm text-muted-foreground">Request to join an organization</div>
                  </button>
                </div>
              </div>

              {orgOption === 'create' ? (
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="orgName" className="text-sm font-medium">
                      Organization Name *
                    </label>
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
                  {generatedSubdomain && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Generated Subdomain
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                          {generatedSubdomain}
                        </div>
                        <span className="text-sm text-muted-foreground">.yourdomain.com</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This subdomain will be automatically generated from your organization name.
                      </p>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Organization'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleJoinOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="joinSubdomain" className="text-sm font-medium">
                      Organization Subdomain *
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="joinSubdomain"
                        type="text"
                        value={joinSubdomain}
                        onChange={(e) => handleJoinSubdomainChange(e.target.value)}
                        placeholder="acme"
                        required
                        disabled={loading}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground">.yourdomain.com</span>
                    </div>
                    {checkingSubdomain && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Looking up organization...
                      </div>
                    )}
                    {subdomainError && (
                      <div className="text-sm text-red-500">{subdomainError}</div>
                    )}
                    {foundOrganization && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="font-medium text-green-900 dark:text-green-100">
                          {foundOrganization.name}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Request to join this organization
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !foundOrganization}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      'Send Join Request'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default OrganizationSetupModal;

