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
  setDoc,
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

// ============================================
// COMMENTS COLLECTION FUNCTIONS
// ============================================

// Create a comment
export const createComment = async (commentData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const commentPayload = {
      problemSpaceId: commentData.problemSpaceId,
      insightId: commentData.insightId || null, // Optional: comment on specific insight
      userId,
      content: commentData.content,
      resolved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'comments'), commentPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }
};

// Get comments for a problem space (and optionally a specific insight)
export const getComments = async (problemSpaceId, insightId = null) => {
  try {
    // Fetch all comments for the problem space
    const q = query(
      collection(db, 'comments'),
      where('problemSpaceId', '==', problemSpaceId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const comments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by insightId if specified (null means general comments)
      if (insightId !== null && data.insightId !== insightId) {
        return;
      }
      if (insightId === null && data.insightId !== null) {
        return;
      }

      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    return comments;
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
};

// Update a comment
export const updateComment = async (commentId, updates, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }

    const commentData = commentSnap.data();
    // Check permissions (only comment author can update)
    if (commentData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    await updateDoc(commentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating comment:', error);
    return { success: false, error: error.message };
  }
};

// Delete a comment
export const deleteComment = async (commentId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      return { success: false, error: 'Comment not found' };
    }

    const commentData = commentSnap.data();
    // Check permissions (only comment author can delete)
    if (commentData.userId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    await deleteDoc(commentRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
};

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
    if (profileData.bio !== undefined) updateData.bio = profileData.bio;
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

// ============================================
// SHARING COLLECTION FUNCTIONS
// ============================================

// Create a share link for a problem space
export const createShareLink = async (problemSpaceId, shareData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return { success: false, error: 'Problem space not found' };
    }

    // Check permissions (only owner or contributors can share)
    if (problemSpaceData.userId !== userId && !problemSpaceData.contributors?.includes(userId)) {
      return { success: false, error: 'Permission denied' };
    }

    // Generate a unique share token
    const shareToken = `${problemSpaceId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const sharePayload = {
      problemSpaceId,
      shareToken,
      createdBy: userId,
      password: shareData.password || null,
      expiresAt: shareData.expiresAt ? new Date(shareData.expiresAt) : null,
      permission: shareData.permission || 'view', // view, edit
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'shareLinks'), sharePayload);
    return { success: true, id: docRef.id, shareToken };
  } catch (error) {
    console.error('Error creating share link:', error);
    return { success: false, error: error.message };
  }
};

// Get share link by token
export const getShareLinkByToken = async (shareToken) => {
  try {
    const q = query(
      collection(db, 'shareLinks'),
      where('shareToken', '==', shareToken)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    // Check if expired
    if (data.expiresAt) {
      const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        return null; // Expired
      }
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
    };
  } catch (error) {
    console.error('Error getting share link:', error);
    return null;
  }
};

// Get all share links for a problem space
export const getShareLinks = async (problemSpaceId, userId) => {
  try {
    if (!userId) {
      return [];
    }

    const problemSpaceData = await getProblemSpaceById(problemSpaceId);
    if (!problemSpaceData) {
      return [];
    }

    // Check permissions
    if (problemSpaceData.userId !== userId && !problemSpaceData.contributors?.includes(userId)) {
      return [];
    }

    const q = query(
      collection(db, 'shareLinks'),
      where('problemSpaceId', '==', problemSpaceId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const shareLinks = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shareLinks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
      });
    });

    return shareLinks;
  } catch (error) {
    console.error('Error loading share links:', error);
    return [];
  }
};

// Delete a share link
export const deleteShareLink = async (shareLinkId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const shareLinkRef = doc(db, 'shareLinks', shareLinkId);
    const shareLinkSnap = await getDoc(shareLinkRef);
    
    if (!shareLinkSnap.exists()) {
      return { success: false, error: 'Share link not found' };
    }

    const shareLinkData = shareLinkSnap.data();
    // Check permissions
    if (shareLinkData.createdBy !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    await deleteDoc(shareLinkRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting share link:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// TEAM MANAGEMENT FUNCTIONS
// ============================================

// Get team members for a team
export const getTeamMembers = async (teamId, userId) => {
  try {
    if (!teamId || !userId) {
      return [];
    }

    // Get team document to check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return [];
    }

    const teamData = teamSnap.data();
    // Check if user is a member of the team
    if (!teamData.members?.includes(userId) && teamData.ownerId !== userId) {
      return [];
    }

    // Get team members from teamMembers subcollection or members array
    const membersQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId)
    );

    const membersSnapshot = await getDocs(membersQuery);
    const members = [];

    membersSnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role || 'researcher',
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt
      });
    });

    // If no subcollection members, use members array from team document
    if (members.length === 0 && teamData.members) {
      // Fetch user profiles for each member
      for (const memberId of teamData.members) {
        const userProfile = await getUserProfile(memberId);
        if (userProfile) {
          members.push({
            id: memberId,
            userId: memberId,
            email: userProfile.email,
            displayName: userProfile.displayName,
            role: teamData.roles?.[memberId] || 'researcher'
          });
        }
      }
    }

    return members;
  } catch (error) {
    console.error('Error loading team members:', error);
    return [];
  }
};

// Invite a team member
export const inviteTeamMember = async (teamId, email, role, userId) => {
  try {
    if (!teamId || !email || !userId) {
      return { success: false, error: 'Team ID, email, and user ID are required' };
    }

    // Check if user has permission to invite (must be team owner or admin)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can invite members' };
    }

    // Create invitation document
    const invitationPayload = {
      teamId,
      email,
      role: role || 'researcher',
      invitedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: null // Could add expiration logic
    };

    const docRef = await addDoc(collection(db, 'teamInvitations'), invitationPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error inviting team member:', error);
    return { success: false, error: error.message };
  }
};

// Get pending invitations for a team
export const getPendingInvitations = async (teamId, userId) => {
  try {
    if (!teamId || !userId) {
      return [];
    }

    // Check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return [];
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return [];
    }

    const q = query(
      collection(db, 'teamInvitations'),
      where('teamId', '==', teamId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const invitations = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
      });
    });

    return invitations;
  } catch (error) {
    console.error('Error loading pending invitations:', error);
    return [];
  }
};

// Update team member role
export const updateMemberRole = async (teamId, memberId, newRole, userId) => {
  try {
    if (!teamId || !memberId || !userId) {
      return { success: false, error: 'Team ID, member ID, and user ID are required' };
    }

    // Check permissions (only admin or owner can update roles)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can update roles' };
    }

    // Update role in teamMembers subcollection if it exists
    const memberQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId),
      where('userId', '==', memberId)
    );

    const memberSnapshot = await getDocs(memberQuery);
    if (!memberSnapshot.empty) {
      const memberDoc = memberSnapshot.docs[0];
      await updateDoc(doc(db, 'teamMembers', memberDoc.id), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } else {
      // Update in team document roles map
      const currentRoles = teamData.roles || {};
      await updateDoc(teamRef, {
        roles: { ...currentRoles, [memberId]: newRole },
        updatedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: error.message };
  }
};

// Remove team member
export const removeTeamMember = async (teamId, memberId, userId) => {
  try {
    if (!teamId || !memberId || !userId) {
      return { success: false, error: 'Team ID, member ID, and user ID are required' };
    }

    // Check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can remove members' };
    }

    // Cannot remove owner
    if (teamData.ownerId === memberId) {
      return { success: false, error: 'Cannot remove team owner' };
    }

    // Remove from teamMembers subcollection
    const memberQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId),
      where('userId', '==', memberId)
    );

    const memberSnapshot = await getDocs(memberQuery);
    if (!memberSnapshot.empty) {
      for (const memberDoc of memberSnapshot.docs) {
        await deleteDoc(doc(db, 'teamMembers', memberDoc.id));
      }
    }

    // Remove from team document members array and roles
    const currentMembers = teamData.members || [];
    const currentRoles = teamData.roles || {};
    const updatedMembers = currentMembers.filter(id => id !== memberId);
    const { [memberId]: removedRole, ...updatedRoles } = currentRoles;

    await updateDoc(teamRef, {
      members: updatedMembers,
      roles: updatedRoles,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return { success: false, error: error.message };
  }
};

// Create a team
export const createTeam = async (teamData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const teamPayload = {
      name: teamData.name || 'My Team',
      ownerId: userId,
      members: [userId], // Owner is first member
      roles: { [userId]: 'admin' },
      defaultRole: teamData.defaultRole || 'researcher',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'teams'), teamPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message };
  }
};

// Update team settings
export const updateTeamSettings = async (teamId, settings, userId) => {
  try {
    if (!teamId || !userId) {
      return { success: false, error: 'Team ID and user ID are required' };
    }

    // Check permissions (only admin or owner can update settings)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can update team settings' };
    }

    const updateData = {
      updatedAt: serverTimestamp()
    };

    if (settings.name !== undefined) updateData.name = settings.name;
    if (settings.defaultRole !== undefined) updateData.defaultRole = settings.defaultRole;

    await updateDoc(teamRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating team settings:', error);
    return { success: false, error: error.message };
  }
};

// Get user's teams
export const getUserTeams = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    // Get teams where user is a member
    const q = query(
      collection(db, 'teams'),
      where('members', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const teams = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    return teams;
  } catch (error) {
    console.error('Error loading user teams:', error);
    return [];
  }
};

// ============================================
// RESEARCH CONFIGURATION FUNCTIONS
// ============================================

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
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
      
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

// ============================================
// PRIVACY & SECURITY SETTINGS FUNCTIONS
// ============================================

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
        problemSpaces: { enabled: false, days: 0 }
      },
      dataResidency: {
        region: 'us-east-1'
      },
      accessControls: {
        ipAllowlisting: false,
        allowedIPs: [],
        sessionTimeout: 30,
        twoFactorAuth: false,
        problemSpaceSharing: 'team'
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
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
      
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

// ============================================
// ACTIVITIES COLLECTION FUNCTIONS
// ============================================

// Create an activity
export const createActivity = async (activityData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const activityPayload = {
      type: activityData.type, // 'insight_added', 'comment', 'problem_space_updated', 'project_changed'
      problemSpaceId: activityData.problemSpaceId || null,
      projectId: activityData.projectId || null,
      insightId: activityData.insightId || null,
      commentId: activityData.commentId || null,
      userId,
      description: activityData.description,
      metadata: activityData.metadata || {},
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'activities'), activityPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { success: false, error: error.message };
  }
};

// Get activities for a problem space
export const getActivities = async (problemSpaceId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'activities'),
      where('problemSpaceId', '==', problemSpaceId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const activities = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      });
    });

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
};

// Get activities for a project
export const getProjectActivities = async (projectId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'activities'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const activities = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
      });
    });

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error loading project activities:', error);
    return [];
  }
};

// Get audit logs with filtering
export const getAuditLogs = async (userId, filters = {}, limit = 100) => {
  try {
    if (!userId) {
      return [];
    }

    // Build query based on filters
    let q = query(collection(db, 'activities'));

    // Filter by user if specified
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    // Filter by action type (map to activity type)
    if (filters.actionType && filters.actionType !== 'all') {
      const actionTypeMap = {
        'create': ['session_created', 'project_created', 'problem_space_created', 'insight_added'],
        'update': ['session_updated', 'project_updated', 'problem_space_updated', 'insight_updated'],
        'delete': ['session_deleted', 'project_deleted', 'problem_space_deleted', 'insight_deleted'],
        'view': ['session_viewed', 'project_viewed', 'problem_space_viewed']
      };
      
      const types = actionTypeMap[filters.actionType] || [];
      if (types.length > 0) {
        // Firestore doesn't support OR queries easily, so we'll filter in memory
        // For now, we'll query all and filter
      }
    }

    // Filter by resource type
    if (filters.resourceType && filters.resourceType !== 'all') {
      const resourceFieldMap = {
        'session': 'sessionId',
        'project': 'projectId',
        'problemSpace': 'problemSpaceId',
        'insight': 'insightId'
      };
      
      const field = resourceFieldMap[filters.resourceType];
      if (field) {
        // We'll need to query by the appropriate field
        // For now, filter in memory after fetching
      }
    }

    // Add date range filtering
    if (filters.dateFrom || filters.dateTo) {
      // Date filtering will be done in memory for simplicity
      // A production system would use Firestore timestamp queries
    }

    // Order by creation date
    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const auditLogs = [];
    const userIds = new Set();

    // First pass: collect all logs and user IDs
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      
      // Apply date range filter
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        if (createdAt < dateFrom) return;
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999); // End of day
        if (createdAt > dateTo) return;
      }

      // Apply action type filter
      if (filters.actionType && filters.actionType !== 'all') {
        const actionTypeMap = {
          'create': ['session_created', 'project_created', 'problem_space_created', 'insight_added'],
          'update': ['session_updated', 'project_updated', 'problem_space_updated', 'insight_updated'],
          'delete': ['session_deleted', 'project_deleted', 'problem_space_deleted', 'insight_deleted'],
          'view': ['session_viewed', 'project_viewed', 'problem_space_viewed']
        };
        
        const types = actionTypeMap[filters.actionType] || [];
        if (types.length > 0 && !types.includes(data.type)) {
          return;
        }
      }

      // Apply resource type filter
      if (filters.resourceType && filters.resourceType !== 'all') {
        const resourceFieldMap = {
          'session': 'sessionId',
          'project': 'projectId',
          'problemSpace': 'problemSpaceId',
          'insight': 'insightId'
        };
        
        const field = resourceFieldMap[filters.resourceType];
        if (field && !data[field] && !data[field.replace('Id', 'Id')]) {
          return;
        }
      }

      // Collect user ID for batch fetching
      if (data.userId) {
        userIds.add(data.userId);
      }

      // Map activity type to action and resource type
      const actionMap = {
        'session_created': 'Create',
        'session_updated': 'Update',
        'session_deleted': 'Delete',
        'session_viewed': 'View',
        'project_created': 'Create',
        'project_updated': 'Update',
        'project_deleted': 'Delete',
        'project_viewed': 'View',
        'problem_space_created': 'Create',
        'problem_space_updated': 'Update',
        'problem_space_deleted': 'Delete',
        'problem_space_viewed': 'View',
        'insight_added': 'Create',
        'insight_updated': 'Update',
        'insight_deleted': 'Delete',
        'comment': 'Comment'
      };

      const resourceTypeMap = {
        'session_created': 'Session',
        'session_updated': 'Session',
        'session_deleted': 'Session',
        'session_viewed': 'Session',
        'project_created': 'Project',
        'project_updated': 'Project',
        'project_deleted': 'Project',
        'project_viewed': 'Project',
        'problem_space_created': 'Problem Space',
        'problem_space_updated': 'Problem Space',
        'problem_space_deleted': 'Problem Space',
        'problem_space_viewed': 'Problem Space',
        'insight_added': 'Insight',
        'insight_updated': 'Insight',
        'insight_deleted': 'Insight',
        'comment': 'Comment'
      };

      auditLogs.push({
        id: doc.id,
        timestamp: createdAt.toISOString(),
        userEmail: data.userId, // Will be updated below
        userId: data.userId,
        action: actionMap[data.type] || data.type,
        resourceType: resourceTypeMap[data.type] || 'Unknown',
        details: data.description || data.metadata?.details || '',
        type: data.type,
        metadata: data.metadata || {}
      });
    });

    // Batch fetch user profiles (limit to avoid too many requests)
    const userIdsArray = Array.from(userIds).slice(0, 50);
    const userProfilePromises = userIdsArray.map(userId => getUserProfile(userId).catch(() => null));
    const userProfiles = await Promise.all(userProfilePromises);
    const userEmailMap = {};
    
    userProfiles.forEach((profile, index) => {
      if (profile && profile.email) {
        userEmailMap[userIdsArray[index]] = profile.email;
      }
    });

    // Update audit logs with user emails
    auditLogs.forEach(log => {
      if (userEmailMap[log.userId]) {
        log.userEmail = userEmailMap[log.userId];
      }
    });

    return auditLogs.slice(0, limit);
  } catch (error) {
    console.error('Error loading audit logs:', error);
    return [];
  }
};

// ============================================
// INTEGRATIONS FUNCTIONS
// ============================================

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
      const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'researcher');
      
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

