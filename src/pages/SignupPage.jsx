import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrganizationBySubdomain, isSubdomainAvailable } from '@/lib/firestoreUtils';
import { Loader2, Building2, Users } from 'lucide-react';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: account info, 2: organization selection
  
  // Organization selection state
  const [orgOption, setOrgOption] = useState('create'); // 'create' or 'join'
  const [orgName, setOrgName] = useState('');
  const [orgSubdomain, setOrgSubdomain] = useState('');
  const [joinSubdomain, setJoinSubdomain] = useState('');
  const [foundOrganization, setFoundOrganization] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainError, setSubdomainError] = useState('');
  
  const { signup } = useAuth();
  const navigate = useNavigate();

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

  // Handle subdomain input for creating new organization
  const handleSubdomainChange = async (value) => {
    setOrgSubdomain(value);
    setSubdomainError('');
    
    // If empty, subdomain is optional so no validation needed
    if (!value || value.trim() === '') {
      return;
    }
    
    const normalized = value.toLowerCase().trim();
    
    // Basic client-side validation (will be validated server-side too)
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
    
    setCheckingSubdomain(true);
    try {
      const available = await isSubdomainAvailable(normalized);
      if (!available) {
        setSubdomainError('This subdomain is already taken');
      } else {
        setSubdomainError('');
      }
    } catch (error) {
      console.error('Error checking subdomain:', error);
      // Show the actual error message from the function
      // This could be a validation error, network error, etc.
      const errorMessage = error.message || 'Error checking subdomain availability';
      
      // Check if it's a validation error (format issue)
      if (errorMessage.includes('Subdomain must be') || 
          errorMessage.includes('Subdomain can only') ||
          errorMessage.includes('Subdomain cannot')) {
        setSubdomainError(errorMessage);
      } else {
        // Network or other errors
        setSubdomainError('Unable to check subdomain availability. Please check your connection and try again.');
      }
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleAccountInfoSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Move to organization selection step
    setStep(2);
  };

  const handleOrganizationSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (orgOption === 'create') {
      if (!orgName.trim()) {
        setError('Organization name is required');
        return;
      }
      // Only check subdomain error if subdomain is provided (it's optional)
      if (orgSubdomain && orgSubdomain.trim() && subdomainError) {
        setError('Please fix the subdomain error before continuing');
        return;
      }
    } else if (orgOption === 'join') {
      if (!joinSubdomain.trim()) {
        setError('Please enter an organization subdomain');
        return;
      }
      if (!foundOrganization) {
        setError('Please verify the organization exists before continuing');
        return;
      }
    }

    setLoading(true);

    // Prepare organization data
    const organizationData = orgOption === 'create' 
      ? { 
          name: orgName.trim(),
          subdomain: orgSubdomain.trim() || null,
          action: 'create'
        }
      : {
          organizationId: foundOrganization.id,
          action: 'join'
        };

    const result = await signup(email, password, organizationData);

    if (result.success) {
      if (orgOption === 'join') {
        // Show message that request is pending
        navigate('/', { 
          replace: true,
          state: { 
            message: 'Your request to join has been sent. An admin will review it shortly.' 
          }
        });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      setError(result.error || 'Failed to create account');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    setSubdomainError('');
    setFoundOrganization(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 1 ? 'Create Account' : 'Organization Setup'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? 'Enter your information to create a new account'
              : 'Choose to create a new organization or join an existing one'}
          </CardDescription>
        </CardHeader>
        
        {step === 1 ? (
          <form onSubmit={handleAccountInfoSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                Continue
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleOrganizationSubmit}>
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
                <div className="space-y-4">
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
                  <div className="space-y-2">
                    <label htmlFor="orgSubdomain" className="text-sm font-medium">
                      Subdomain (optional)
                    </label>
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
                      <span className="text-sm text-muted-foreground">.yourdomain.com</span>
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
                    {orgSubdomain && !subdomainError && !checkingSubdomain && (
                      <div className="text-sm text-green-600">Subdomain available!</div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Leave blank to auto-generate from organization name. Used for organization lookup.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="joinSubdomain" className="text-sm font-medium">
                      Organization Subdomain *
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="joinSubdomain"
                        type="text"
                        value={joinSubdomain}
                        onChange={(e) => {
                          setJoinSubdomain(e.target.value);
                          handleSubdomainLookup(e.target.value);
                        }}
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
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || (orgOption === 'join' && !foundOrganization)}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </div>
              <div className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};

export default SignupPage;

