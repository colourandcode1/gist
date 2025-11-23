// Firestore utility functions for nuggets
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { getSessions, getSessionById } from './sessions';

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

