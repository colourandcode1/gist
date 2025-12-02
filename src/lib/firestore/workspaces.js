// Firestore utility functions for workspaces
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
import { getOrganizationById } from './organizations';

// Get workspaces for an organization
export const getWorkspaces = async (organizationId) => {
  try {
    if (!organizationId) {
      return [];
    }

    const q = query(
      collection(db, 'workspaces'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const workspaces = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      workspaces.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    return workspaces;
  } catch (error) {
    console.error('Error loading workspaces:', error);
    return [];
  }
};

// Create a new workspace
export const createWorkspace = async (workspaceData, userId, organizationId) => {
  try {
    if (!userId || !organizationId) {
      return { success: false, error: 'User ID and organization ID are required' };
    }

    // Check workspace limit before creating
    // Try to get organization, but if it fails due to permissions (e.g., just created), proceed anyway
    let organization = null;
    let existingWorkspaces = [];
    try {
      organization = await getOrganizationById(organizationId);
      if (organization) {
        // Get current workspace count
        existingWorkspaces = await getWorkspaces(organizationId);
        const currentCount = existingWorkspaces.length;

        // Check if organization can create more workspaces
        const { canCreateWorkspace, getWorkspaceLimit } = await import('../subscriptionUtils');
        if (!canCreateWorkspace(organization, currentCount)) {
          const limit = getWorkspaceLimit(organization);
          return { 
            success: false, 
            error: limit === null 
              ? 'Unable to create workspace' 
              : `Workspace limit reached (${limit} workspaces). Please upgrade your plan to create more workspaces.`
          };
        }
      }
    } catch (error) {
      // If we can't read the organization (e.g., permissions issue or just created),
      // proceed anyway - the security rules will enforce permissions
      console.warn('Could not read organization for workspace limit check, proceeding anyway:', error.message);
    }

    const workspacePayload = {
      name: workspaceData.name || 'My Workspace',
      description: workspaceData.description || '',
      organizationId,
      createdBy: userId, // Immutable - for audit trail
      ownerId: userId, // Transferable - for ownership/permissions
      permissions: workspaceData.permissions || null, // Enterprise only
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'workspaces'), workspacePayload);
    console.log('Workspace created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating workspace:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get workspace by ID
export const getWorkspaceById = async (workspaceId) => {
  try {
    if (!workspaceId) {
      return null;
    }

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (workspaceSnap.exists()) {
      const data = workspaceSnap.data();
      return {
        id: workspaceSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting workspace:', error);
    return null;
  }
};

// Update workspace
export const updateWorkspace = async (workspaceId, updates, userId) => {
  try {
    if (!workspaceId || !userId) {
      return { success: false, error: 'Workspace ID and user ID are required' };
    }

    const workspaceData = await getWorkspaceById(workspaceId);
    if (!workspaceData) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check permissions (only owner or admin can update)
    const isOwner = workspaceData.ownerId === userId;
    const isAdmin = await checkIsAdmin(userId, workspaceData.organizationId);
    
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied. Only workspace owner or organization admin can update.' };
    }

    // SECURITY: Prevent organizationId from being changed
    // Workspaces cannot be moved between organizations
    const { organizationId, createdBy, createdAt, ownerId, ...safeUpdates } = updates;
    
    // Warn if someone tries to change organizationId
    if (organizationId !== undefined && organizationId !== workspaceData.organizationId) {
      console.warn(`Attempt to change workspace organizationId blocked: ${workspaceId}`);
      return { success: false, error: 'Cannot change workspace organization. Workspaces cannot be moved between organizations.' };
    }

    // Prevent createdBy from being changed (immutable audit field)
    if (createdBy !== undefined && createdBy !== workspaceData.createdBy) {
      console.warn(`Attempt to change workspace createdBy blocked: ${workspaceId}`);
      return { success: false, error: 'Cannot change workspace creator. This field is immutable for audit purposes.' };
    }

    // Prevent createdAt from being changed (immutable audit field)
    if (createdAt !== undefined) {
      console.warn(`Attempt to change workspace createdAt blocked: ${workspaceId}`);
      return { success: false, error: 'Cannot change workspace creation date. This field is immutable for audit purposes.' };
    }

    // Handle ownerId transfer (if provided)
    let finalUpdates = { ...safeUpdates };
    if (ownerId !== undefined && ownerId !== workspaceData.ownerId) {
      // Validate new owner belongs to same organization
      const transferResult = await validateOwnershipTransfer(workspaceId, ownerId, workspaceData.organizationId);
      if (!transferResult.valid) {
        return { success: false, error: transferResult.error };
      }
      finalUpdates.ownerId = ownerId;
    }

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
      ...finalUpdates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating workspace:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to check if user is admin of organization
async function checkIsAdmin(userId, organizationId) {
  try {
    const { getUserProfile } = await import('./users');
    const userProfile = await getUserProfile(userId);
    if (!userProfile) return false;
    
    return userProfile.organizationId === organizationId && 
           userProfile.role === 'member' && 
           userProfile.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Validate ownership transfer
async function validateOwnershipTransfer(workspaceId, newOwnerId, organizationId) {
  try {
    if (!newOwnerId) {
      return { valid: false, error: 'New owner ID is required' };
    }

    // Get new owner's profile
    const { getUserProfile } = await import('./users');
    const newOwnerProfile = await getUserProfile(newOwnerId);
    
    if (!newOwnerProfile) {
      return { valid: false, error: 'New owner not found' };
    }

    // CRITICAL: New owner must belong to the same organization
    if (newOwnerProfile.organizationId !== organizationId) {
      return { 
        valid: false, 
        error: 'Cannot transfer ownership to user from different organization. This would violate data isolation.' 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating ownership transfer:', error);
    return { valid: false, error: error.message };
  }
}

// Transfer workspace ownership
export const transferWorkspaceOwnership = async (workspaceId, newOwnerId, currentUserId) => {
  try {
    if (!workspaceId || !newOwnerId || !currentUserId) {
      return { success: false, error: 'Workspace ID, new owner ID, and current user ID are required' };
    }

    const workspaceData = await getWorkspaceById(workspaceId);
    if (!workspaceData) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check permissions (only current owner or admin can transfer)
    const isOwner = workspaceData.ownerId === currentUserId;
    const isAdmin = await checkIsAdmin(currentUserId, workspaceData.organizationId);
    
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied. Only workspace owner or organization admin can transfer ownership.' };
    }

    // Validate transfer
    const validation = await validateOwnershipTransfer(workspaceId, newOwnerId, workspaceData.organizationId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Update ownership
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
      ownerId: newOwnerId,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error transferring workspace ownership:', error);
    return { success: false, error: error.message };
  }
};

// Delete workspace
export const deleteWorkspace = async (workspaceId, userId) => {
  try {
    if (!workspaceId || !userId) {
      return { success: false, error: 'Workspace ID and user ID are required' };
    }

    const workspaceData = await getWorkspaceById(workspaceId);
    if (!workspaceData) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check permissions (only owner or admin can delete)
    const isOwner = workspaceData.ownerId === userId;
    const isAdmin = await checkIsAdmin(userId, workspaceData.organizationId);
    
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied. Only workspace owner or organization admin can delete.' };
    }

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await deleteDoc(workspaceRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return { success: false, error: error.message };
  }
};

// Set workspace permissions (Enterprise only)
export const setWorkspacePermissions = async (workspaceId, permissions, userId) => {
  try {
    if (!workspaceId || !userId) {
      return { success: false, error: 'Workspace ID and user ID are required' };
    }

    const workspaceData = await getWorkspaceById(workspaceId);
    if (!workspaceData) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check if organization has Enterprise tier
    const orgData = await getOrganizationById(workspaceData.organizationId);
    if (!orgData || orgData.tier !== 'enterprise') {
      return { success: false, error: 'Workspace permissions are only available for Enterprise tier' };
    }

    // Check permissions (only owner or admin can set permissions)
    const isOwner = workspaceData.ownerId === userId;
    const isAdmin = await checkIsAdmin(userId, workspaceData.organizationId);
    
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied. Only workspace owner or organization admin can set permissions.' };
    }

    const workspaceRef = doc(db, 'workspaces', workspaceId);
    await updateDoc(workspaceRef, {
      permissions,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting workspace permissions:', error);
    return { success: false, error: error.message };
  }
};

// Get workspace permissions
export const getWorkspacePermissions = async (workspaceId) => {
  try {
    const workspaceData = await getWorkspaceById(workspaceId);
    if (!workspaceData) {
      return null;
    }
    return workspaceData.permissions || null;
  } catch (error) {
    console.error('Error getting workspace permissions:', error);
    return null;
  }
};

// Get workspace members (users who have this workspace in their workspaceIds array)
export const getWorkspaceMembers = async (workspaceId) => {
  try {
    if (!workspaceId) {
      return [];
    }

    // Get all users who have this workspace in their workspaceIds array
    const q = query(
      collection(db, 'users'),
      where('workspaceIds', 'array-contains', workspaceId)
    );

    const querySnapshot = await getDocs(q);
    const members = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        email: data.email,
        role: data.role,
        is_admin: data.is_admin || false,
        ...data
      });
    });

    return members;
  } catch (error) {
    console.error('Error getting workspace members:', error);
    return [];
  }
};

// Add a user to a workspace
export const addWorkspaceMember = async (workspaceId, userId) => {
  try {
    if (!workspaceId || !userId) {
      return { success: false, error: 'Workspace ID and user ID are required' };
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userSnap.data();
    const workspaceIds = userData.workspaceIds || [];

    // Check if user is already a member
    if (workspaceIds.includes(workspaceId)) {
      return { success: false, error: 'User is already a member of this workspace' };
    }

    // Add workspace to user's workspaceIds array
    await updateDoc(userRef, {
      workspaceIds: [...workspaceIds, workspaceId],
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding workspace member:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Remove a user from a workspace
export const removeWorkspaceMember = async (workspaceId, userId) => {
  try {
    if (!workspaceId || !userId) {
      return { success: false, error: 'Workspace ID and user ID are required' };
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userSnap.data();
    const workspaceIds = userData.workspaceIds || [];

    // Check if user is a member
    if (!workspaceIds.includes(workspaceId)) {
      return { success: false, error: 'User is not a member of this workspace' };
    }

    // Remove workspace from user's workspaceIds array
    await updateDoc(userRef, {
      workspaceIds: workspaceIds.filter(id => id !== workspaceId),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing workspace member:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};
