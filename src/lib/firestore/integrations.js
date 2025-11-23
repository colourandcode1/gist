// Firestore utility functions for integrations
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

// Get integrations for user or team
export const getIntegrations = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return null;
    }

    let integrationsRef;
    if (teamId) {
      integrationsRef = doc(db, 'integrations', `${teamId}_integrations`);
    } else {
      integrationsRef = doc(db, 'integrations', `${userId}_integrations`);
    }

    const integrationsSnap = await getDoc(integrationsRef);
    if (integrationsSnap.exists()) {
      return { id: integrationsSnap.id, ...integrationsSnap.data() };
    }

    // Return default integrations if none exists
    return {
      googleDrive: { enabled: false, connected: false },
      oneDrive: { enabled: false, connected: false },
      slack: { enabled: false, connected: false },
      zapier: { enabled: false, connected: false },
      calendar: { enabled: false, connected: false },
      notion: { enabled: false, connected: false },
      mcp: {
        enabled: false,
        endpoint: '',
        apiKey: '',
        dataSharing: false
      }
    };
  } catch (error) {
    console.error('Error getting integrations:', error);
    return null;
  }
};

// Update integration settings
export const updateIntegration = async (userId, integrationName, integrationData, teamId = null) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    let integrationsRef;
    if (teamId) {
      // Check if user has permission to update team integrations (must be admin)
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        return { success: false, error: 'Team not found' };
      }

      const teamData = teamSnap.data();
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
      
      if (userRole !== 'admin' && teamData.ownerId !== userId) {
        return { success: false, error: 'Permission denied - only admins can update team integrations' };
      }

      integrationsRef = doc(db, 'integrations', `${teamId}_integrations`);
    } else {
      integrationsRef = doc(db, 'integrations', `${userId}_integrations`);
    }

    // Get existing integrations
    const integrationsSnap = await getDoc(integrationsRef);
    const existingIntegrations = integrationsSnap.exists() ? integrationsSnap.data() : {};

    const updateData = {
      userId: teamId ? null : userId,
      teamId: teamId || null,
      updatedAt: serverTimestamp()
    };

    // Update specific integration
    if (integrationName === 'mcp') {
      updateData.mcp = integrationData;
    } else {
      updateData[integrationName] = integrationData;
    }

    // Merge with existing integrations
    const mergedIntegrations = {
      ...existingIntegrations,
      ...updateData
    };

    // Set createdAt if this is a new document
    if (!integrationsSnap.exists()) {
      mergedIntegrations.createdAt = serverTimestamp();
    }

    await setDoc(integrationsRef, mergedIntegrations, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating integration:', error);
    return { success: false, error: error.message };
  }
};
