import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getOrganizationById, getOrganizationByOwner, getWorkspaces, createOrganization, createWorkspace } from '@/lib/firestoreUtils';
import { createJoinRequest, getRequestsByUser } from '@/lib/firestoreUtils';
import {
  canUploadSessions,
  canCreateNuggets,
  canEditNuggets,
  canManageTeam,
  canManageBilling,
  canConfigureWorkspacePermissions,
  canViewDashboard,
  canUseSSO,
  canBulkOperations
} from '@/lib/permissions';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userOrganization, setUserOrganization] = useState(null);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to create organization and default workspace for a user
  const createUserOrganization = async (userId, userEmail) => {
    try {
      // Generate organization name from email domain or use default
      let orgName = 'My Organization';
      if (userEmail && userEmail.includes('@')) {
        const domain = userEmail.split('@')[1];
        orgName = `${domain.charAt(0).toUpperCase() + domain.slice(1)} Organization`;
      }

      // Create organization
      const orgResult = await createOrganization(
        {
          name: orgName,
          tier: 'small_team',
          workspaceLimit: 1
        },
        userId
      );

      if (!orgResult.success) {
        console.error('Failed to create organization:', orgResult.error);
        return null;
      }

      // Create default workspace
      const workspaceResult = await createWorkspace(
        {
          name: 'Default Workspace',
          description: 'Default workspace for your organization'
        },
        userId,
        orgResult.id
      );

      if (!workspaceResult.success) {
        console.error('Failed to create default workspace:', workspaceResult.error);
        // Organization was created but workspace failed - still return org
        return { organizationId: orgResult.id, workspaceId: null };
      }

      // Update user profile with organizationId and workspaceIds
      await setDoc(
        doc(db, 'users', userId),
        {
          organizationId: orgResult.id,
          workspaceIds: [workspaceResult.id],
          is_admin: true, // User is admin of their own organization
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      return { organizationId: orgResult.id, workspaceId: workspaceResult.id };
    } catch (error) {
      console.error('Error creating user organization:', error);
      return null;
    }
  };

  // Migrate old roles to new role structure
  const migrateUserRole = (profileData) => {
    if (!profileData.role) return { ...profileData, role: 'member', is_admin: false };
    
    // Migrate old roles to new structure
    if (profileData.role === 'researcher' || profileData.role === 'contributor') {
      return {
        ...profileData,
        role: 'member',
        is_admin: false
      };
    }
    
    // Migrate old admin role
    if (profileData.role === 'admin') {
      return {
        ...profileData,
        role: 'member',
        is_admin: true
      };
    }
    
    // Ensure is_admin exists for member role
    if (profileData.role === 'member' && profileData.is_admin === undefined) {
      return {
        ...profileData,
        is_admin: false
      };
    }
    
    return profileData;
  };

  // Check for approved join requests and handle them
  const checkPendingJoinRequests = async (userId) => {
    try {
      const requests = await getRequestsByUser(userId);
      const approvedRequest = requests.find(r => r.status === 'approved' && !r.processed);
      
      if (approvedRequest) {
        // User has an approved request - assign them to organization
        const { getWorkspaces } = await import('@/lib/firestoreUtils');
        const workspaces = await getWorkspaces(approvedRequest.organizationId);
        const defaultWorkspaceId = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

        await setDoc(
          doc(db, 'users', userId),
          {
            organizationId: approvedRequest.organizationId,
            workspaceIds: defaultWorkspaceId ? [defaultWorkspaceId] : [],
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        // Mark request as processed (optional - you might want to keep it for history)
        // For now, we'll just return the organization info
        return {
          organizationId: approvedRequest.organizationId,
          message: 'Your request to join has been approved!'
        };
      }
      
      // Check for pending requests
      const pendingRequest = requests.find(r => r.status === 'pending');
      if (pendingRequest) {
        return {
          hasPendingRequest: true,
          organizationId: pendingRequest.organizationId
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking join requests:', error);
      return null;
    }
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user) => {
    if (!user) {
      setUserProfile(null);
      setUserOrganization(null);
      setUserWorkspaces([]);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        const migratedProfile = migrateUserRole(profileData);
        
        // Update in database if migration occurred
        if (migratedProfile.role !== profileData.role || 
            migratedProfile.is_admin !== profileData.is_admin) {
          try {
            await setDoc(doc(db, 'users', user.uid), migratedProfile, { merge: true });
          } catch (migrationError) {
            console.warn('Could not update user role in database:', migrationError);
          }
        }
        
        setUserProfile(migratedProfile);
        
        // Check for approved join requests first (before checking existing organization)
        if (!profileData.organizationId) {
          const joinRequestResult = await checkPendingJoinRequests(user.uid);
          if (joinRequestResult && joinRequestResult.organizationId) {
            // User was just approved - fetch the organization
            profileData.organizationId = joinRequestResult.organizationId;
            // Update profile data
            await setDoc(
              doc(db, 'users', user.uid),
              { organizationId: joinRequestResult.organizationId },
              { merge: true }
            );
          }
        }
        
        // Fetch organization if user has one
        if (profileData.organizationId) {
          try {
            const org = await getOrganizationById(profileData.organizationId);
            setUserOrganization(org);
            
            // Fetch workspaces if organization exists
            if (org) {
              const workspaces = await getWorkspaces(org.id);
              setUserWorkspaces(workspaces);
            } else {
              setUserWorkspaces([]);
            }
          } catch (orgError) {
            console.error('Error fetching organization:', orgError);
            setUserOrganization(null);
            setUserWorkspaces([]);
          }
        } else {
          // Check for pending requests
          const joinRequestResult = await checkPendingJoinRequests(user.uid);
          if (joinRequestResult && joinRequestResult.hasPendingRequest) {
            // User has a pending request - don't create organization automatically
            setUserOrganization(null);
            setUserWorkspaces([]);
            // Note: You might want to show a notification here about pending request
          } else {
            // Try to find organization by owner
            try {
              const org = await getOrganizationByOwner(user.uid);
              if (org) {
                setUserOrganization(org);
                // Update user profile with organizationId
                await setDoc(
                  doc(db, 'users', user.uid),
                  { organizationId: org.id },
                  { merge: true }
                );
                // Fetch workspaces
                const workspaces = await getWorkspaces(org.id);
                setUserWorkspaces(workspaces);
              } else {
                // User doesn't have an organization and no pending requests
                // Don't auto-create - let them choose during signup or later
                setUserOrganization(null);
                setUserWorkspaces([]);
              }
            } catch (orgError) {
              console.error('Error fetching organization:', orgError);
              setUserOrganization(null);
              setUserWorkspaces([]);
            }
          }
        }
      } else {
        // Create user profile on first login with default role
        const newUserProfile = {
          email: user.email,
          role: 'member', // Default role: member
          is_admin: false, // Admin is a permission flag on Member role
          organizationId: null,
          workspaceIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(doc(db, 'users', user.uid), newUserProfile);
          setUserProfile(newUserProfile);
          
          // Check for approved join requests
          const joinRequestResult = await checkPendingJoinRequests(user.uid);
          if (joinRequestResult && joinRequestResult.organizationId) {
            // User was just approved - fetch the organization
            await setDoc(
              doc(db, 'users', user.uid),
              { organizationId: joinRequestResult.organizationId },
              { merge: true }
            );
            const newOrg = await getOrganizationById(joinRequestResult.organizationId);
            if (newOrg) {
              setUserOrganization(newOrg);
              const workspaces = await getWorkspaces(newOrg.id);
              setUserWorkspaces(workspaces);
            } else {
              setUserOrganization(null);
              setUserWorkspaces([]);
            }
          } else {
            // No approved request - user needs to create or join organization
            setUserOrganization(null);
            setUserWorkspaces([]);
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // If profile creation fails due to permissions, still allow login
          // but log the error for debugging
          if (profileError.code === 'permission-denied') {
            console.warn('Firestore permission denied when creating user profile. Check your security rules.');
          }
          // Set a minimal profile so the user can still log in
          setUserProfile({ email: user.email, role: 'member', is_admin: false });
          setUserOrganization(null);
          setUserWorkspaces([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't block login if profile fetch fails - set a minimal profile
      if (error.code === 'permission-denied') {
        console.warn('Firestore permission denied when fetching user profile. Check your security rules.');
      }
      setUserProfile({ email: user.email, role: 'member', is_admin: false });
      setUserOrganization(null);
      setUserWorkspaces([]);
    }
  };

  // Sign up function
  const signup = async (email, password, organizationData = null) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile first
      const newUserProfile = {
        email: user.email,
        role: 'member',
        is_admin: false,
        organizationId: null,
        workspaceIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'users', user.uid), newUserProfile);
        setUserProfile(newUserProfile);
      } catch (profileError) {
        console.error('Error creating user profile:', profileError);
        // Continue anyway - profile might be created by fetchUserProfile
      }

      // Handle organization setup based on user's choice
      if (organizationData) {
        if (organizationData.action === 'create') {
          // Create new organization
          const orgResult = await createOrganization(
            {
              name: organizationData.name,
              subdomain: organizationData.subdomain || null,
              tier: 'small_team',
              workspaceLimit: 1
            },
            user.uid
          );

          if (orgResult.success) {
            // Create default workspace
            const workspaceResult = await createWorkspace(
              {
                name: 'Default Workspace',
                description: 'Default workspace for your organization'
              },
              user.uid,
              orgResult.id
            );

            if (workspaceResult.success) {
              // Update user profile with organization and workspace
              await setDoc(
                doc(db, 'users', user.uid),
                {
                  organizationId: orgResult.id,
                  workspaceIds: [workspaceResult.id],
                  is_admin: true, // User is admin of their own organization
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );

              // Fetch organization and workspaces
              const newOrg = await getOrganizationById(orgResult.id);
              if (newOrg) {
                setUserOrganization(newOrg);
                const workspaces = await getWorkspaces(newOrg.id);
                setUserWorkspaces(workspaces);
              }
            } else {
              // Organization created but workspace failed
              await setDoc(
                doc(db, 'users', user.uid),
                {
                  organizationId: orgResult.id,
                  is_admin: true,
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );
              const newOrg = await getOrganizationById(orgResult.id);
              if (newOrg) {
                setUserOrganization(newOrg);
                setUserWorkspaces([]);
              }
            }
          } else {
            console.error('Failed to create organization:', orgResult.error);
            // User account created but organization failed - they can create it later
          }
        } else if (organizationData.action === 'join' && organizationData.organizationId) {
          // Create join request instead of auto-joining
          const requestResult = await createJoinRequest(
            organizationData.organizationId,
            user.uid,
            user.email
          );

          if (!requestResult.success) {
            console.error('Failed to create join request:', requestResult.error);
            // User account created but request failed - they can request again later
          }
          // User profile remains without organizationId until request is approved
        }
      } else {
        // No organization data provided - create default organization (backward compatibility)
        const orgResult = await createUserOrganization(user.uid, user.email);
        if (orgResult && orgResult.organizationId) {
          const newOrg = await getOrganizationById(orgResult.organizationId);
          if (newOrg) {
            setUserOrganization(newOrg);
            const workspaces = await getWorkspaces(newOrg.id);
            setUserWorkspaces(workspaces);
          }
        }
      }

      // Refresh user profile to get latest data
      await fetchUserProfile(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Signup error:', error);
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }
      return { success: false, error: errorMessage };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Wait for auth state to update and profile to be fetched
      // The onAuthStateChanged listener will handle this, but we can also fetch immediately
      await fetchUserProfile(userCredential.user);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and Firebase configuration.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      }
      return { success: false, error: errorMessage };
    }
  };

  // Sign out function
  const signout = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Update email function
  const updateUserEmail = async (newEmail) => {
    if (!currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      await updateEmail(currentUser, newEmail);
      // Update email in Firestore profile
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          email: newEmail,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      await fetchUserProfile(currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Update password function
  const updateUserPassword = async (newPassword) => {
    if (!currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      await updatePassword(currentUser, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!userProfile) return false;
    return userProfile.role === role;
  };

  // Check if user is admin (Member with is_admin flag)
  const isAdmin = () => {
    if (!userProfile) return false;
    return userProfile.role === 'member' && userProfile.is_admin === true;
  };

  // Check if user can edit (member or admin)
  const canEdit = () => {
    if (!userProfile) return false;
    return userProfile.role === 'member'; // All members can edit
  };

  // Check if user can view (all roles)
  const canView = () => {
    return !!userProfile;
  };

  // New permission check functions
  const canUploadSessionsCheck = () => {
    if (!userProfile) return false;
    return canUploadSessions(userProfile.role, userProfile.is_admin || false);
  };

  const canCreateNuggetsCheck = () => {
    if (!userProfile) return false;
    return canCreateNuggets(userProfile.role, userProfile.is_admin || false);
  };

  const canEditNuggetsCheck = (nuggetOwnerId = null) => {
    if (!userProfile || !currentUser) return false;
    return canEditNuggets(userProfile.role, nuggetOwnerId, currentUser.uid, userProfile.is_admin || false);
  };

  const canManageTeamCheck = () => {
    if (!userProfile) return false;
    return canManageTeam(userProfile.role, userProfile.is_admin || false);
  };

  const canManageBillingCheck = () => {
    if (!userProfile) return false;
    return canManageBilling(userProfile.role, userProfile.is_admin || false);
  };

  const canConfigureWorkspacePermissionsCheck = () => {
    if (!userProfile || !userOrganization) return false;
    return canConfigureWorkspacePermissions(userOrganization.tier, userProfile.role, userProfile.is_admin || false);
  };

  const canViewDashboardCheck = () => {
    // Dashboard is available to all authenticated users
    return !!currentUser;
  };

  const canUseSSOCheck = () => {
    if (!userOrganization) return false;
    return canUseSSO(userOrganization.tier);
  };

  const canBulkOperationsCheck = () => {
    if (!userProfile || !userOrganization) return false;
    return canBulkOperations(userOrganization.tier, userProfile.role, userProfile.is_admin || false);
  };

  // Get user organization
  const getUserOrganization = () => {
    return userOrganization;
  };

  // Get user workspaces
  const getUserWorkspaces = () => {
    return userWorkspaces;
  };

  // Refresh user profile from Firestore
  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserProfile(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    userOrganization,
    userWorkspaces,
    signup,
    login,
    signout,
    updateUserEmail,
    updateUserPassword,
    resetPassword,
    hasRole,
    isAdmin,
    canEdit,
    canView,
    canUploadSessions: canUploadSessionsCheck,
    canCreateNuggets: canCreateNuggetsCheck,
    canEditNuggets: canEditNuggetsCheck,
    canManageTeam: canManageTeamCheck,
    canManageBilling: canManageBillingCheck,
    canConfigureWorkspacePermissions: canConfigureWorkspacePermissionsCheck,
    canViewDashboard: canViewDashboardCheck,
    canUseSSO: canUseSSOCheck,
    canBulkOperations: canBulkOperationsCheck,
    getUserOrganization,
    getUserWorkspaces,
    refreshUserProfile,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

