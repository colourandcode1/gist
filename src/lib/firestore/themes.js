// Firestore utility functions for themes
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

// Create a new theme
export const createTheme = async (themeData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create theme');
    }

    const themePayload = {
      name: themeData.name,
      description: themeData.description || '',
      privacy: themeData.privacy || 'private', // private, team
      userId, // Owner of the theme
      teamId: themeData.teamId || null, // null = private, will be set when added to team
      workspaceId: themeData.workspaceId || null, // Workspace ID for organization structure
      contributors: themeData.contributors || [userId], // Include creator as initial contributor
      outputType: themeData.outputType || null, // Optional output type
      problemStatement: themeData.problemStatement || '',
      keyQuestions: themeData.keyQuestions || [],
      linkedProjects: themeData.linkedProjects || [],
      insightIds: themeData.insightIds || [], // Array of insight references (sessionId:nuggetId)
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'themes'), themePayload);
    console.log('Theme created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating theme:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get all themes for a user (and optionally a team)
export const getThemes = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return [];
    }

    let q;
    if (teamId) {
      // Get themes for specific team
      q = query(
        collection(db, 'themes'),
        where('teamId', '==', teamId),
        orderBy('updatedAt', 'desc')
      );
    } else {
      // Get user's own themes (userId matches or user is contributor)
      // Note: Firestore doesn't support OR queries easily, so we'll fetch and filter
      q = query(
        collection(db, 'themes'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const themes = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out team themes if teamId is null (private only)
      if (!teamId && data.teamId !== null) {
        return;
      }
      
      themes.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    // Also get themes where user is a contributor (if not team query)
    if (!teamId) {
      try {
        const contributorQuery = query(
          collection(db, 'themes'),
          orderBy('updatedAt', 'desc')
        );
        const contributorSnapshot = await getDocs(contributorQuery);
        contributorSnapshot.forEach((doc) => {
          const data = doc.data();
          // Check if user is a contributor and it's a team theme
          if (data.teamId !== null && data.contributors?.includes(userId)) {
            // Avoid duplicates
            if (!themes.find(t => t.id === doc.id)) {
              themes.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
              });
            }
          }
        });
      } catch (contributorError) {
        // If contributor query fails (likely missing index), try without orderBy
        if (contributorError.code === 'failed-precondition') {
          console.warn('Firestore index may be missing for contributor query. Using fallback.');
          try {
            const fallbackContributorQuery = query(
              collection(db, 'themes')
            );
            const fallbackContributorSnapshot = await getDocs(fallbackContributorQuery);
            fallbackContributorSnapshot.forEach((doc) => {
              const data = doc.data();
              // Check if user is a contributor and it's a team theme
              if (data.teamId !== null && data.contributors?.includes(userId)) {
                // Avoid duplicates
                if (!themes.find(t => t.id === doc.id)) {
                  themes.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
                  });
                }
              }
            });
          } catch (fallbackError) {
            console.error('Fallback contributor query also failed:', fallbackError);
          }
        } else {
          console.error('Error loading contributor themes:', contributorError);
        }
      }
      // Re-sort by updatedAt (always sort in memory to ensure correct order)
      themes.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
      });
    }

    return themes;
  } catch (error) {
    console.error('Error loading themes:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Re-throw permission errors so they can be handled by the caller
    if (error.code === 'permission-denied' || error.code === 7) {
      throw error;
    }
    
    // If error is due to missing index, log helpful message and try fallback
    if (error.code === 'failed-precondition') {
      console.warn('Firestore index may be missing. Check Firebase Console for index creation prompts.');
      // Try query without orderBy as fallback
      try {
        let fallbackQuery;
        if (teamId) {
          fallbackQuery = query(
            collection(db, 'themes'),
            where('teamId', '==', teamId)
          );
        } else {
          fallbackQuery = query(
            collection(db, 'themes'),
            where('userId', '==', userId)
          );
        }
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackThemes = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out team themes if teamId is null (private only)
          if (!teamId && data.teamId !== null) {
            return;
          }
          fallbackThemes.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          });
        });
        
        // Also try to get contributor themes (without orderBy)
        if (!teamId) {
          try {
            const fallbackContributorQuery = query(
              collection(db, 'themes')
            );
            const fallbackContributorSnapshot = await getDocs(fallbackContributorQuery);
            fallbackContributorSnapshot.forEach((doc) => {
              const data = doc.data();
              // Check if user is a contributor and it's a team theme
              if (data.teamId !== null && data.contributors?.includes(userId)) {
                // Avoid duplicates
                if (!fallbackThemes.find(t => t.id === doc.id)) {
                  fallbackThemes.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
                  });
                }
              }
            });
          } catch (contributorError) {
            console.error('Fallback contributor query failed:', contributorError);
          }
        }
        
        // Sort in memory
        fallbackThemes.sort((a, b) => {
          const dateA = new Date(a.updatedAt || 0);
          const dateB = new Date(b.updatedAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded themes without index (sorted in memory). Please create the index for better performance.');
        return fallbackThemes;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      console.warn('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
    return [];
  }
};

// Get a theme by ID
export const getThemeById = async (themeId) => {
  try {
    const themeRef = doc(db, 'themes', themeId);
    const themeSnap = await getDoc(themeRef);
    if (themeSnap.exists()) {
      const data = themeSnap.data();
      return { 
        id: themeSnap.id, 
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting theme:', error);
    return null;
  }
};

// Update a theme
export const updateTheme = async (themeId, updates, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const themeData = await getThemeById(themeId);
    if (!themeData) {
      return { success: false, error: 'Theme not found' };
    }

    // Check permissions (owner or contributor)
    if (themeData.userId !== userId && !themeData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const themeRef = doc(db, 'themes', themeId);
    await updateDoc(themeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating theme:', error);
    return { success: false, error: error.message };
  }
};

// Add an insight to a theme
export const addInsightToTheme = async (themeId, insightId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const themeData = await getThemeById(themeId);
    if (!themeData) {
      return { success: false, error: 'Theme not found' };
    }

    // Check permissions
    if (themeData.userId !== userId && !themeData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const currentInsightIds = themeData.insightIds || [];
    if (currentInsightIds.includes(insightId)) {
      return { success: true, message: 'Insight already in theme' };
    }

    const themeRef = doc(db, 'themes', themeId);
    await updateDoc(themeRef, {
      insightIds: [...currentInsightIds, insightId],
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding insight to theme:', error);
    return { success: false, error: error.message };
  }
};

// Remove an insight from a theme
export const removeInsightFromTheme = async (themeId, insightId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const themeData = await getThemeById(themeId);
    if (!themeData) {
      return { success: false, error: 'Theme not found' };
    }

    // Check permissions
    if (themeData.userId !== userId && !themeData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const currentInsightIds = themeData.insightIds || [];
    const updatedInsightIds = currentInsightIds.filter(id => id !== insightId);

    const themeRef = doc(db, 'themes', themeId);
    await updateDoc(themeRef, {
      insightIds: updatedInsightIds,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing insight from theme:', error);
    return { success: false, error: error.message };
  }
};

// Update theme privacy settings
export const updateThemePrivacy = async (themeId, privacy, teamId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const themeData = await getThemeById(themeId);
    if (!themeData) {
      return { success: false, error: 'Theme not found' };
    }

    // Only owner can change privacy
    if (themeData.userId !== userId) {
      return { success: false, error: 'Permission denied - only owner can change privacy' };
    }

    const themeRef = doc(db, 'themes', themeId);
    await updateDoc(themeRef, {
      privacy,
      teamId: privacy === 'team' ? teamId : null,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating theme privacy:', error);
    return { success: false, error: error.message };
  }
};

// Delete a theme
export const deleteTheme = async (themeId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const themeData = await getThemeById(themeId);
    if (!themeData) {
      return { success: false, error: 'Theme not found' };
    }

    // Check permissions (only owner can delete)
    if (themeData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const themeRef = doc(db, 'themes', themeId);
    await deleteDoc(themeRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting theme:', error);
    return { success: false, error: error.message };
  }
};

