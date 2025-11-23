// Firestore utility functions for privacySecurity
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
  setDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

// Get privacy/security settings for user or team
export const getPrivacySecuritySettings = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return null;
    }

    let settingsRef;
    if (teamId) {
      settingsRef = doc(db, 'privacySecuritySettings', `${teamId}_settings`);
    } else {
      settingsRef = doc(db, 'privacySecuritySettings', `${userId}_settings`);
    }

    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      return { id: settingsSnap.id, ...settingsSnap.data() };
    }

    // Return default settings if none exists
    return {
      piiDetection: {
        enabled: true,
        types: {
          email: true,
          phone: true,
          ssn: true,
          creditCard: false,
          address: false
        },
        redactionMethod: 'mask'
      },
      dataRetention: {
        transcripts: { enabled: true, days: 365 },
        nuggets: { enabled: true, days: 730 },
        sessionRecordings: { enabled: true, days: 90 },
        auditLogs: { enabled: true, days: 2555 },
        themes: { enabled: false, days: 0 }
      },
      dataResidency: {
        region: 'us-east-1'
      },
      accessControls: {
        ipAllowlisting: false,
        allowedIPs: [],
        sessionTimeout: 30,
        twoFactorAuth: false,
        themeSharing: 'team'
      }
    };
  } catch (error) {
    console.error('Error getting privacy/security settings:', error);
    return null;
  }
};

// Update privacy/security settings
export const updatePrivacySecuritySettings = async (userId, settings, teamId = null) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    let settingsRef;
    if (teamId) {
      // Check if user has permission to update team settings (must be admin)
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        return { success: false, error: 'Team not found' };
      }

      const teamData = teamSnap.data();
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
      
      if (userRole !== 'admin' && teamData.ownerId !== userId) {
        return { success: false, error: 'Permission denied - only admins can update team privacy/security settings' };
      }

      settingsRef = doc(db, 'privacySecuritySettings', `${teamId}_settings`);
    } else {
      settingsRef = doc(db, 'privacySecuritySettings', `${userId}_settings`);
    }

    const updateData = {
      userId: teamId ? null : userId,
      teamId: teamId || null,
      updatedAt: serverTimestamp()
    };

    if (settings.piiDetection !== undefined) updateData.piiDetection = settings.piiDetection;
    if (settings.dataRetention !== undefined) updateData.dataRetention = settings.dataRetention;
    if (settings.dataResidency !== undefined) updateData.dataResidency = settings.dataResidency;
    if (settings.accessControls !== undefined) updateData.accessControls = settings.accessControls;

    // Set createdAt if this is a new document
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      updateData.createdAt = serverTimestamp();
    }

    await setDoc(settingsRef, updateData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating privacy/security settings:', error);
    return { success: false, error: error.message };
  }
};
