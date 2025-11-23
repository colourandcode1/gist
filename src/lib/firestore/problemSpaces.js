// Firestore utility functions for problemSpaces
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

// Create a new problem space
export const createProblemSpace = async (problemSpaceData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create problem space');
    }

    const problemSpacePayload = {
      name: problemSpaceData.name,
      description: problemSpaceData.description || '',
      privacy: problemSpaceData.privacy || 'private', // private, team
      userId, // Owner of the problem space
      teamId: problemSpaceData.teamId || null, // null = private, will be set when added to team
      workspaceId: problemSpaceData.workspaceId || null, // Workspace ID for organization structure
      contributors: problemSpaceData.contributors || [userId], // Include creator as initial contributor
      outputType: problemSpaceData.outputType || null, // Optional output type
      problemStatement: problemSpaceData.problemStatement || '',
      keyQuestions: problemSpaceData.keyQuestions || [],
      linkedProjects: problemSpaceData.linkedProjects || [],
      insightIds: problemSpaceData.insightIds || [], // Array of insight references (sessionId:nuggetId)
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'problemSpaces'), problemSpacePayload);
    console.log('Problem space created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating problem space:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get all problem spaces for a user (and optionally a team)
export const getProblemSpaces = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return [];
    }

    let q;
    if (teamId) {
      // Get problem spaces for specific team
      q = query(
        collection(db, 'problemSpaces'),
        where('teamId', '==', teamId),
        orderBy('updatedAt', 'desc')
      );
    } else {
      // Get user's own problem spaces (userId matches or user is contributor)
      // Note: Firestore doesn't support OR queries easily, so we'll fetch and filter
      q = query(
        collection(db, 'problemSpaces'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const problemSpaces = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out team problem spaces if teamId is null (private only)
      if (!teamId && data.teamId !== null) {
        return;
      }
      
      problemSpaces.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    // Also get problem spaces where user is a contributor (if not team query)
    if (!teamId) {
      try {
        const contributorQuery = query(
          collection(db, 'problemSpaces'),
          orderBy('updatedAt', 'desc')
        );
        const contributorSnapshot = await getDocs(contributorQuery);
        contributorSnapshot.forEach((doc) => {
          const data = doc.data();
          // Check if user is a contributor and it's a team problem space
          if (data.teamId !== null && data.contributors?.includes(userId)) {
            // Avoid duplicates
            if (!problemSpaces.find(ps => ps.id === doc.id)) {
              problemSpaces.push({
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
              collection(db, 'problemSpaces')
            );
            const fallbackContributorSnapshot = await getDocs(fallbackContributorQuery);
            fallbackContributorSnapshot.forEach((doc) => {
              const data = doc.data();
              // Check if user is a contributor and it's a team problem space
              if (data.teamId !== null && data.contributors?.includes(userId)) {
                // Avoid duplicates
                if (!problemSpaces.find(ps => ps.id === doc.id)) {
                  problemSpaces.push({
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
          console.error('Error loading contributor problem spaces:', contributorError);
        }
      }
      // Re-sort by updatedAt (always sort in memory to ensure correct order)
      problemSpaces.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
      });
    }

    return problemSpaces;
  } catch (error) {
    console.error('Error loading problem spaces:', error);
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
            collection(db, 'problemSpaces'),
            where('teamId', '==', teamId)
          );
        } else {
          fallbackQuery = query(
            collection(db, 'problemSpaces'),
            where('userId', '==', userId)
          );
        }
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackProblemSpaces = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out team problem spaces if teamId is null (private only)
          if (!teamId && data.teamId !== null) {
            return;
          }
          fallbackProblemSpaces.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          });
        });
        
        // Also try to get contributor problem spaces (without orderBy)
        if (!teamId) {
          try {
            const fallbackContributorQuery = query(
              collection(db, 'problemSpaces')
            );
            const fallbackContributorSnapshot = await getDocs(fallbackContributorQuery);
            fallbackContributorSnapshot.forEach((doc) => {
              const data = doc.data();
              // Check if user is a contributor and it's a team problem space
              if (data.teamId !== null && data.contributors?.includes(userId)) {
                // Avoid duplicates
                if (!fallbackProblemSpaces.find(ps => ps.id === doc.id)) {
                  fallbackProblemSpaces.push({
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
        fallbackProblemSpaces.sort((a, b) => {
          const dateA = new Date(a.updatedAt || 0);
          const dateB = new Date(b.updatedAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded problem spaces without index (sorted in memory). Please create the index for better performance.');
        return fallbackProblemSpaces;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      console.warn('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
    return [];
  }
};

// Get a problem space by ID
export const getProblemSpaceById = async (problemSpaceId) => {
  try {
    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    const problemSpaceSnap = await getDoc(problemSpaceRef);
    if (problemSpaceSnap.exists()) {
      const data = problemSpaceSnap.data();
      return { 
        id: problemSpaceSnap.id, 
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting problem space:', error);
    return null;
  }
};

// Update a problem space
export const updateProblemSpace = async (problemSpaceId, updates, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Check permissions (owner or contributor)
    if (problemSpaceData.userId !== userId && !problemSpaceData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    await updateDoc(problemSpaceRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating problem space:', error);
    return { success: false, error: error.message };
  }
};

// Add an insight to a problem space
export const addInsightToProblemSpace = async (problemSpaceId, insightId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Check permissions
    if (problemSpaceData.userId !== userId && !problemSpaceData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const currentInsightIds = problemSpaceData.insightIds || [];
    if (currentInsightIds.includes(insightId)) {
      return { success: true, message: 'Insight already in problem space' };
    }

    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    await updateDoc(problemSpaceRef, {
      insightIds: [...currentInsightIds, insightId],
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding insight to problem space:', error);
    return { success: false, error: error.message };
  }
};

// Remove an insight from a problem space
export const removeInsightFromProblemSpace = async (problemSpaceId, insightId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Check permissions
    if (problemSpaceData.userId !== userId && !problemSpaceData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    const currentInsightIds = problemSpaceData.insightIds || [];
    const updatedInsightIds = currentInsightIds.filter(id => id !== insightId);

    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    await updateDoc(problemSpaceRef, {
      insightIds: updatedInsightIds,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing insight from problem space:', error);
    return { success: false, error: error.message };
  }
};

// Update problem space privacy settings
export const updateProblemSpacePrivacy = async (problemSpaceId, privacy, teamId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Only owner can change privacy
    if (problemSpaceData.userId !== userId) {
      return { success: false, error: 'Permission denied - only owner can change privacy' };
    }

    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    await updateDoc(problemSpaceRef, {
      privacy,
      teamId: privacy === 'team' ? teamId : null,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating problem space privacy:', error);
    return { success: false, error: error.message };
  }
};

// Delete a problem space
export const deleteProblemSpace = async (problemSpaceId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Check permissions (only owner can delete)
    if (problemSpaceData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const problemSpaceRef = doc(db, 'problemSpaces', problemSpaceId);
    await deleteDoc(problemSpaceRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting problem space:', error);
    return { success: false, error: error.message };
  }
};
