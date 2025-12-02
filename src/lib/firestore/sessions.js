// Firestore utility functions for sessions
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

// Save a new session to Firestore
export const saveSession = async (sessionData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to save session');
    }

    // Ensure workspaceId is set - get from user's default workspace if not provided
    let workspaceId = sessionData.workspaceId;
    if (!workspaceId) {
      try {
        const { getUserProfile } = await import('./users');
        const userProfile = await getUserProfile(userId);
        if (userProfile?.workspaceIds && userProfile.workspaceIds.length > 0) {
          workspaceId = userProfile.workspaceIds[0];
        } else {
          // If user has no workspace, try to get from organization
          if (userProfile?.organizationId) {
            const { getWorkspaces } = await import('./workspaces');
            const workspaces = await getWorkspaces(userProfile.organizationId);
            if (workspaces && workspaces.length > 0) {
              workspaceId = workspaces[0].id;
            }
          }
        }
      } catch (error) {
        console.warn('Could not determine workspaceId for session:', error);
        // Continue without workspaceId - Firestore rules will handle this
      }
    }

    const sessionPayload = {
      ...sessionData,
      userId, // Owner of the session
      teamId: null, // null = private, will be set when added to team
      projectId: sessionData.projectId || null, // null = unassigned, will be set when added to project
      workspaceId: workspaceId || null, // Workspace ID for organization structure - REQUIRED for multi-tenant isolation
      // Participant context fields (optional structured object)
      participantContext: sessionData.participantContext || null,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'sessions'), sessionPayload);
    console.log('Session created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving session:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get sessions for a user (and optionally a team or workspace)
// Note: excludeTranscriptContent - when true, removes transcript_content to save memory/bandwidth
export const getSessions = async (userId, teamId = null, excludeTranscriptContent = true, workspaceIds = null) => {
  try {
    if (!userId) {
      return [];
    }

    // Add timeout to prevent hanging on permission errors
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - check Firestore security rules')), 10000)
    );

    let q;
    if (teamId) {
      // Get sessions for specific team
      q = query(
        collection(db, 'sessions'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
    } else if (workspaceIds && workspaceIds.length > 0) {
      // Filter by workspaceIds for organization isolation
      // Firestore 'in' query supports up to 10 values
      const workspaceIdsToQuery = workspaceIds.slice(0, 10);
      q = query(
        collection(db, 'sessions'),
        where('workspaceId', 'in', workspaceIdsToQuery),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get user's own sessions (userId matches)
      // Note: Filtering by teamId === null requires a composite index
      // For now, we'll fetch all user sessions and filter in memory
      q = query(
        collection(db, 'sessions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out team sessions if teamId is null (private sessions only)
      if (!teamId && data.teamId !== null) {
        return; // Skip team sessions when fetching private sessions
      }
      
      // If filtering by workspaceIds, ensure session belongs to one of the workspaces
      if (workspaceIds && workspaceIds.length > 0) {
        if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
          return; // Skip sessions not in user's workspaces
        }
      }
      
      // Exclude transcript_content to save memory and bandwidth
      // It can be fetched separately when needed
      const { transcript_content, ...sessionData } = data;
      
      sessions.push({
        id: doc.id,
        ...sessionData,
        // Convert Firestore timestamps to ISO strings for compatibility
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        // Store flag indicating transcript exists (without the actual content)
        _hasTranscript: !!transcript_content
      });
    });
    
    // Handle case where user has more than 10 workspaces (Firestore 'in' limit)
    if (workspaceIds && workspaceIds.length > 10) {
      for (let i = 10; i < workspaceIds.length; i += 10) {
        const batch = workspaceIds.slice(i, i + 10);
        try {
          const batchQuery = query(
            collection(db, 'sessions'),
            where('workspaceId', 'in', batch),
            orderBy('createdAt', 'desc')
          );
          const batchSnapshot = await getDocs(batchQuery);
          batchSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
              return;
            }
            const { transcript_content, ...sessionData } = data;
            if (!sessions.find(s => s.id === doc.id)) {
              sessions.push({
                id: doc.id,
                ...sessionData,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                _hasTranscript: !!transcript_content
              });
            }
          });
        } catch (error) {
          console.error('Error loading batch of sessions:', error);
        }
      }
    }

    return sessions;
  } catch (error) {
    console.error('Error loading sessions:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Re-throw permission errors so they can be handled by the caller
    if (error.code === 'permission-denied' || error.code === 7) {
      throw error;
    }
    
    // If error is due to missing index, log helpful message and show alert
    if (error.code === 'failed-precondition') {
      console.warn('Firestore index may be missing. Check Firebase Console for index creation prompts.');
      // Try query without orderBy as fallback
      try {
        const fallbackQuery = query(
          collection(db, 'sessions'),
          where('userId', '==', userId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackSessions = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          if (!teamId && data.teamId !== null) {
            return;
          }
        // Exclude transcript_content in fallback too
        const { transcript_content, ...sessionData } = data;
        fallbackSessions.push({
          id: doc.id,
          ...sessionData,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          _hasTranscript: !!transcript_content
        });
        });
        // Sort in memory
        fallbackSessions.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded sessions without index (sorted in memory). Please create the index for better performance.');
        return fallbackSessions;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      alert('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
    return [];
  }
};

// Helper function to get session by ID (includes transcript_content)
export const getSessionById = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      return { 
        id: sessionSnap.id, 
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// Update a session
export const updateSession = async (sessionId, updates, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const sessionData = await getSessionById(sessionId);
    if (!sessionData) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating session:', error);
    return { success: false, error: error.message };
  }
};

// Delete a session (and all its nuggets are automatically deleted since they're embedded)
export const deleteSession = async (sessionId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const sessionData = await getSessionById(sessionId);
    if (!sessionData) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    // Delete the session document - nuggets are automatically deleted since they're embedded
    const sessionRef = doc(db, 'sessions', sessionId);
    await deleteDoc(sessionRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message };
  }
};

// Get sessions by project
export const getSessionsByProject = async (projectId, userId) => {
  try {
    if (!projectId || !userId) {
      return [];
    }

    // Query sessions where projectId matches
    const q = query(
      collection(db, 'sessions'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Only return sessions that belong to the user (or are in a team the user belongs to)
      // For now, we'll filter by userId for simplicity
      if (data.userId === userId) {
        const { transcript_content, ...sessionData } = data;
        sessions.push({
          id: doc.id,
          ...sessionData,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          _hasTranscript: !!transcript_content
        });
      }
    });

    return sessions;
  } catch (error) {
    console.error('Error loading sessions by project:', error);
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
        const fallbackQuery = query(
          collection(db, 'sessions'),
          where('projectId', '==', projectId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackSessions = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId === userId) {
            const { transcript_content, ...sessionData } = data;
            fallbackSessions.push({
              id: doc.id,
              ...sessionData,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
              _hasTranscript: !!transcript_content
            });
          }
        });
        // Sort in memory
        fallbackSessions.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded sessions by project without index (sorted in memory). Please create the index for better performance.');
        return fallbackSessions;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      console.warn('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
    return [];
  }
};
