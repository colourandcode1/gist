// Firestore utility functions to replace localStorage operations
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
import { db } from './firebase';

// Save a new session to Firestore
export const saveSession = async (sessionData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to save session');
    }

    const sessionPayload = {
      ...sessionData,
      userId, // Owner of the session
      teamId: null, // null = private, will be set when added to team
      projectId: null, // null = unassigned, will be set when added to project
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

// Get sessions for a user (and optionally a team)
// Note: excludeTranscriptContent - when true, removes transcript_content to save memory/bandwidth
export const getSessions = async (userId, teamId = null, excludeTranscriptContent = true) => {
  try {
    if (!userId) {
      return [];
    }

    let q;
    if (teamId) {
      // Get sessions for specific team
      q = query(
        collection(db, 'sessions'),
        where('teamId', '==', teamId),
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

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out team sessions if teamId is null (private sessions only)
      if (!teamId && data.teamId !== null) {
        return; // Skip team sessions when fetching private sessions
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

// Get all nuggets for a user (and optionally a team or project)
export const getAllNuggets = async (userId, teamId = null, projectId = null) => {
  try {
    if (!userId) {
      return [];
    }

    // Get sessions first
    const sessions = await getSessions(userId, teamId);
    
    // Filter by projectId if specified
    const filteredSessions = projectId 
      ? sessions.filter(session => session.projectId === projectId)
      : sessions;
    
    // Extract all nuggets from sessions
    const allNuggets = filteredSessions.flatMap(session =>
      (session.nuggets || []).map(nugget => ({
        ...nugget,
        session_title: session.title,
        session_date: session.session_date,
        session_id: session.id
      }))
    );

    return allNuggets;
  } catch (error) {
    console.error('Error loading nuggets:', error);
    return [];
  }
};

// Get all nuggets from a specific session/transcript
export const getNuggetsBySessionId = async (sessionId, userId) => {
  try {
    if (!userId || !sessionId) {
      return [];
    }

    const sessionData = await getSessionById(sessionId);
    if (!sessionData) {
      return [];
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return [];
    }

    // Return nuggets with session metadata
    return (sessionData.nuggets || []).map(nugget => ({
      ...nugget,
      session_title: sessionData.title,
      session_date: sessionData.session_date,
      session_id: sessionData.id
    }));
  } catch (error) {
    console.error('Error loading nuggets by session:', error);
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

// Helper to get session data without transcript_content for efficient nugget updates
const getSessionByIdForUpdate = async (sessionId) => {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      // Exclude transcript_content from the returned data to save bandwidth
      // We only need it for permission checks and nugget updates
      const { transcript_content, ...sessionDataWithoutTranscript } = data;
      return { 
        id: sessionSnap.id, 
        ...sessionDataWithoutTranscript,
        // Store transcript_content separately so we don't re-save it
        _hasTranscript: !!transcript_content
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// Update nugget category and tags
export const updateNuggetCategoryTags = async (sessionId, nuggetId, newCategory, newTags, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const sessionData = await getSessionByIdForUpdate(sessionId);
    if (!sessionData) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const updatedNuggets = sessionData.nuggets.map(nugget => {
      // Ensure we don't accidentally include transcript_content in any nugget
      const { transcript_content: _, ...cleanNugget } = nugget;
      if (nugget.id !== nuggetId) return cleanNugget;
      return {
        ...cleanNugget,
        category: newCategory ?? cleanNugget.category,
        tags: Array.isArray(newTags) ? newTags : cleanNugget.tags
      };
    });

    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      nuggets: updatedNuggets,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating nugget:', error);
    return { success: false, error: error.message };
  }
};

// Update nugget fields
export const updateNuggetFields = async (sessionId, nuggetId, fields, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const sessionData = await getSessionByIdForUpdate(sessionId);
    if (!sessionData) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const updatedNuggets = sessionData.nuggets.map(nugget => {
      if (nugget.id !== nuggetId) {
        // Ensure other nuggets don't have transcript_content
        const { transcript_content: _, ...cleanNugget } = nugget;
        return cleanNugget;
      }
      // Ensure the updated nugget doesn't include transcript_content
      const { transcript_content: _, ...cleanNugget } = nugget;
      return { ...cleanNugget, ...fields };
    });

    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      nuggets: updatedNuggets,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating nugget fields:', error);
    return { success: false, error: error.message };
  }
};

// Delete a nugget
export const deleteNugget = async (sessionId, nuggetId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const sessionData = await getSessionByIdForUpdate(sessionId);
    if (!sessionData) {
      return { success: false, error: 'Session not found' };
    }

    // Check permissions
    if (sessionData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    // Filter out the nugget and clean any transcript_content that might have leaked in
    const updatedNuggets = sessionData.nuggets
      .filter(nugget => nugget.id !== nuggetId)
      .map(nugget => {
        const { transcript_content: _, ...cleanNugget } = nugget;
        return cleanNugget;
      });

    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      nuggets: updatedNuggets,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting nugget:', error);
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
    if (!userId || !projectId) {
      return [];
    }

    const q = query(
      collection(db, 'sessions'),
      where('projectId', '==', projectId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const { transcript_content, ...sessionData } = data;
      
      sessions.push({
        id: doc.id,
        ...sessionData,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        _hasTranscript: !!transcript_content
      });
    });

    return sessions;
  } catch (error) {
    console.error('Error loading sessions by project:', error);
    return [];
  }
};

