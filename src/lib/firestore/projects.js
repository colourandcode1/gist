// Firestore utility functions for projects
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
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to convert date string to Firestore Timestamp
const convertToTimestamp = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Timestamp) return dateValue;
  if (dateValue instanceof Date) return Timestamp.fromDate(dateValue);
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return Timestamp.fromDate(date);
    }
  }
  return null;
};

// Create a new project
export const createProject = async (projectData, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to create project');
    }

    // Ensure workspaceId is set - get from user's default workspace if not provided
    let workspaceId = projectData.workspaceId;
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
        console.warn('Could not determine workspaceId for project:', error);
        // Continue without workspaceId - Firestore rules will handle this
      }
    }

    const projectPayload = {
      name: projectData.name,
      description: projectData.description || '',
      startDate: convertToTimestamp(projectData.startDate),
      endDate: convertToTimestamp(projectData.endDate),
      status: projectData.status || 'active', // active, completed, archived
      userId, // Owner of the project
      teamId: projectData.teamId || null, // null = private, will be set when added to team
      workspaceId: workspaceId || null, // Workspace ID for organization structure - REQUIRED for multi-tenant isolation
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

// Get all projects for a user (and optionally a team or workspace)
export const getProjects = async (userId, teamId = null, workspaceIds = null) => {
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
    } else if (workspaceIds && workspaceIds.length > 0) {
      // Filter by workspaceIds for organization isolation
      // Firestore 'in' query supports up to 10 values
      const workspaceIdsToQuery = workspaceIds.slice(0, 10);
      q = query(
        collection(db, 'projects'),
        where('workspaceId', 'in', workspaceIdsToQuery),
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
      
      // If filtering by workspaceIds, ensure project belongs to one of the workspaces
      if (workspaceIds && workspaceIds.length > 0) {
        if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
          return; // Skip projects not in user's workspaces
        }
      }
      
      projects.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
      });
    });
    
    // Handle case where user has more than 10 workspaces (Firestore 'in' limit)
    if (workspaceIds && workspaceIds.length > 10) {
      for (let i = 10; i < workspaceIds.length; i += 10) {
        const batch = workspaceIds.slice(i, i + 10);
        try {
          const batchQuery = query(
            collection(db, 'projects'),
            where('workspaceId', 'in', batch),
            orderBy('createdAt', 'desc')
          );
          const batchSnapshot = await getDocs(batchQuery);
          batchSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
              return;
            }
            if (!projects.find(p => p.id === doc.id)) {
              projects.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
                endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
              });
            }
          });
        } catch (error) {
          console.error('Error loading batch of projects:', error);
        }
      }
    }

    return projects;
  } catch (error) {
    console.error('Error loading projects:', error);
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
            collection(db, 'projects'),
            where('teamId', '==', teamId)
          );
        } else {
          fallbackQuery = query(
            collection(db, 'projects'),
            where('userId', '==', userId)
          );
        }
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackProjects = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out team projects if teamId is null (private projects only)
          if (!teamId && data.teamId !== null) {
            return;
          }
          fallbackProjects.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
            endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
          });
        });
        // Sort in memory
        fallbackProjects.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded projects without index (sorted in memory). Please create the index for better performance.');
        return fallbackProjects;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      console.warn('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
    return [];
  }
};

// Get projects by status
export const getProjectsByStatus = async (userId, status, teamId = null, workspaceIds = null) => {
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
    } else if (workspaceIds && workspaceIds.length > 0) {
      // Filter by workspaceIds for organization isolation
      const workspaceIdsToQuery = workspaceIds.slice(0, 10);
      q = query(
        collection(db, 'projects'),
        where('workspaceId', 'in', workspaceIdsToQuery),
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
      
      // If filtering by workspaceIds, ensure project belongs to one of the workspaces
      if (workspaceIds && workspaceIds.length > 0) {
        if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
          return; // Skip projects not in user's workspaces
        }
      }
      
      projects.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
      });
    });
    
    // Handle case where user has more than 10 workspaces (Firestore 'in' limit)
    if (workspaceIds && workspaceIds.length > 10) {
      for (let i = 10; i < workspaceIds.length; i += 10) {
        const batch = workspaceIds.slice(i, i + 10);
        try {
          const batchQuery = query(
            collection(db, 'projects'),
            where('workspaceId', 'in', batch),
            where('status', '==', status),
            orderBy('createdAt', 'desc')
          );
          const batchSnapshot = await getDocs(batchQuery);
          batchSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.workspaceId || !workspaceIds.includes(data.workspaceId)) {
              return;
            }
            if (!projects.find(p => p.id === doc.id)) {
              projects.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
                endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
              });
            }
          });
        } catch (error) {
          console.error('Error loading batch of projects by status:', error);
        }
      }
    }

    return projects;
  } catch (error) {
    console.error('Error loading projects by status:', error);
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
            collection(db, 'projects'),
            where('teamId', '==', teamId),
            where('status', '==', status)
          );
        } else {
          fallbackQuery = query(
            collection(db, 'projects'),
            where('userId', '==', userId),
            where('status', '==', status)
          );
        }
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackProjects = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          if (!teamId && data.teamId !== null) {
            return;
          }
          fallbackProjects.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
            endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
          });
        });
        // Sort in memory
        fallbackProjects.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // descending order
        });
        console.warn('Loaded projects by status without index (sorted in memory). Please create the index for better performance.');
        return fallbackProjects;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
      console.warn('Please create the Firestore index. Check the browser console for the index creation link, or see FIREBASE_SETUP.md for instructions.');
    }
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
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || null),
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || null)
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

    // Convert date strings to Timestamps if present in updates
    const processedUpdates = { ...updates };
    if (updates.startDate !== undefined) {
      processedUpdates.startDate = convertToTimestamp(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = convertToTimestamp(updates.endDate);
    }

    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...processedUpdates,
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

