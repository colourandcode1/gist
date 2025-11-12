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
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user) => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        // Create user profile on first login with default role
        const newUserProfile = {
          email: user.email,
          role: 'researcher', // Default role: admin, researcher, viewer
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(doc(db, 'users', user.uid), newUserProfile);
          setUserProfile(newUserProfile);
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // If profile creation fails due to permissions, still allow login
          // but log the error for debugging
          if (profileError.code === 'permission-denied') {
            console.warn('Firestore permission denied when creating user profile. Check your security rules.');
          }
          // Set a minimal profile so the user can still log in
          setUserProfile({ email: user.email, role: 'researcher' });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't block login if profile fetch fails - set a minimal profile
      if (error.code === 'permission-denied') {
        console.warn('Firestore permission denied when fetching user profile. Check your security rules.');
      }
      setUserProfile({ email: user.email, role: 'researcher' });
    }
  };

  // Sign up function
  const signup = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // User profile will be created automatically in fetchUserProfile
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
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

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Check if user can edit (admin or researcher)
  const canEdit = () => {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || userProfile.role === 'researcher';
  };

  // Check if user can view (all roles)
  const canView = () => {
    return !!userProfile;
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
    refreshUserProfile,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

