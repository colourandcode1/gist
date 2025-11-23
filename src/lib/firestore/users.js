// Firestore utility functions for users
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

// Get user profile by ID
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const userRef = doc(db, 'users', userId);
    
    // Only update provided fields
    const updateData = {
      updatedAt: serverTimestamp()
    };

    // Add profile fields if provided
    if (profileData.displayName !== undefined) updateData.displayName = profileData.displayName;
    if (profileData.emailNotifications !== undefined) updateData.emailNotifications = profileData.emailNotifications;
    if (profileData.sessionReminders !== undefined) updateData.sessionReminders = profileData.sessionReminders;
    if (profileData.weeklyDigest !== undefined) updateData.weeklyDigest = profileData.weeklyDigest;
    if (profileData.theme !== undefined) updateData.theme = profileData.theme;
    if (profileData.language !== undefined) updateData.language = profileData.language;
    if (profileData.dateFormat !== undefined) updateData.dateFormat = profileData.dateFormat;

    await updateDoc(userRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};
