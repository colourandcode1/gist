// Firestore utility functions for researchConfig
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

// Get research configuration for user or team
export const getResearchConfiguration = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return null;
    }

    let configRef;
    if (teamId) {
      // Get team-level config
      configRef = doc(db, 'researchConfig', `${teamId}_config`);
    } else {
      // Get user-level config
      configRef = doc(db, 'researchConfig', `${userId}_config`);
    }

    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      return { id: configSnap.id, ...configSnap.data() };
    }

    // Return default configuration if none exists
    return {
      participantFields: [
        { id: 'companyName', label: 'Company Name', enabled: true, required: false },
        { id: 'companySize', label: 'Company Size', enabled: true, required: false },
        { id: 'userRole', label: 'User Role', enabled: true, required: false },
        { id: 'industry', label: 'Industry', enabled: true, required: false },
        { id: 'productTenure', label: 'Product Tenure', enabled: true, required: false },
        { id: 'userType', label: 'User Type', enabled: true, required: false }
      ],
      customFields: [],
      dictionaries: {
        industryTerms: [],
        companyTerms: [],
        productNames: [],
        acronyms: []
      },
      categories: [
        'Pain Points',
        'Feature Requests',
        'Positive Feedback',
        'Workarounds',
        'Competitive Insights'
      ],
      tags: [
        { name: 'UX', color: '#3b82f6', group: 'General' },
        { name: 'Performance', color: '#10b981', group: 'Technical' },
        { name: 'Security', color: '#ef4444', group: 'Technical' }
      ]
    };
  } catch (error) {
    console.error('Error getting research configuration:', error);
    return null;
  }
};

// Update research configuration
export const updateResearchConfiguration = async (userId, configData, teamId = null) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    let configRef;
    if (teamId) {
      // Check if user has permission to update team config (must be admin)
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        return { success: false, error: 'Team not found' };
      }

      const teamData = teamSnap.data();
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
      
      if (userRole !== 'admin' && teamData.ownerId !== userId) {
        return { success: false, error: 'Permission denied - only admins can update team research configuration' };
      }

      configRef = doc(db, 'researchConfig', `${teamId}_config`);
    } else {
      configRef = doc(db, 'researchConfig', `${userId}_config`);
    }

    const updateData = {
      userId: teamId ? null : userId,
      teamId: teamId || null,
      updatedAt: serverTimestamp()
    };

    if (configData.participantFields !== undefined) updateData.participantFields = configData.participantFields;
    if (configData.customFields !== undefined) updateData.customFields = configData.customFields;
    if (configData.dictionaries !== undefined) updateData.dictionaries = configData.dictionaries;
    if (configData.categories !== undefined) updateData.categories = configData.categories;
    if (configData.tags !== undefined) updateData.tags = configData.tags;

    // Set createdAt if this is a new document
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      updateData.createdAt = serverTimestamp();
    }

    await setDoc(configRef, updateData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating research configuration:', error);
    return { success: false, error: error.message };
  }
};
