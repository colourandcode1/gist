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
      projectId: sessionData.projectId || null, // null = unassigned, will be set when added to project
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

// Get sessions for a user (and optionally a team)
// Note: excludeTranscriptContent - when true, removes transcript_content to save memory/bandwidth
export const getSessions = async (userId, teamId = null, excludeTranscriptContent = true) => {
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

// ============================================
// PROJECTS COLLECTION FUNCTIONS
// ============================================

// Create a new project
export const createProject = async (projectData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create project');
    }

    const projectPayload = {
      name: projectData.name,
      description: projectData.description || '',
      startDate: projectData.startDate || null,
      endDate: projectData.endDate || null,
      status: projectData.status || 'active', // active, completed, archived
      userId, // Owner of the project
      teamId: projectData.teamId || null, // null = private, will be set when added to team
      researchGoals: projectData.researchGoals || [],
      teamMembers: projectData.teamMembers || [],
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'projects'), projectPayload);
    console.log('Project created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get all projects for a user (and optionally a team)
export const getProjects = async (userId, teamId = null) => {
  try {
    if (!userId) {
      return [];
    }

    let q;
    if (teamId) {
      // Get projects for specific team
      q = query(
        collection(db, 'projects'),
        where('teamId', '==', teamId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get user's own projects (userId matches)
      q = query(
        collection(db, 'projects'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const projects = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out team projects if teamId is null (private projects only)
      if (!teamId && data.teamId !== null) {
        return; // Skip team projects when fetching private projects
      }
      
      projects.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      });
    });

    return projects;
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
};

// Get projects by status
export const getProjectsByStatus = async (userId, status, teamId = null) => {
  try {
    if (!userId) {
      return [];
    }

    let q;
    if (teamId) {
      q = query(
        collection(db, 'projects'),
        where('teamId', '==', teamId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'projects'),
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const projects = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!teamId && data.teamId !== null) {
        return;
      }
      
      projects.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      });
    });

    return projects;
  } catch (error) {
    console.error('Error loading projects by status:', error);
    return [];
  }
};

// Get a project by ID
export const getProjectById = async (projectId) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const data = projectSnap.data();
      return { 
        id: projectSnap.id, 
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
};

// Update a project
export const updateProject = async (projectId, updates, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const projectData = await getProjectById(projectId);
    if (!projectData) {
      return { success: false, error: 'Project not found' };
    }

    // Check permissions
    if (projectData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }
};

// Delete a project
export const deleteProject = async (projectId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const projectData = await getProjectById(projectId);
    if (!projectData) {
      return { success: false, error: 'Project not found' };
    }

    // Check permissions
    if (projectData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// PROBLEM SPACES COLLECTION FUNCTIONS
// ============================================

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
      // Re-sort by updatedAt
      problemSpaces.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
      });
    }

    return problemSpaces;
  } catch (error) {
    console.error('Error loading problem spaces:', error);
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

