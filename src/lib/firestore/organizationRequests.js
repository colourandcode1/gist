// Firestore utility functions for organization join requests
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
import { getUserProfile, updateUserProfile } from './users';

// Create a join request for an organization
export const createJoinRequest = async (organizationId, userId, userEmail) => {
  try {
    if (!organizationId || !userId) {
      return { success: false, error: 'Organization ID and user ID are required' };
    }

    // Check if organization exists
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    // Check if user already belongs to an organization
    const userProfile = await getUserProfile(userId);
    if (userProfile?.organizationId) {
      return { success: false, error: 'You already belong to an organization. Please leave your current organization first.' };
    }

    // Check if there's already a pending request
    const existingRequest = await getPendingRequestByUser(organizationId, userId);
    if (existingRequest) {
      return { success: false, error: 'You already have a pending request for this organization.' };
    }

    const requestPayload = {
      organizationId,
      userId,
      userEmail: userEmail || userProfile?.email || '',
      status: 'pending',
      requestedAt: serverTimestamp(),
      respondedAt: null,
      respondedBy: null
    };

    const docRef = await addDoc(collection(db, 'organizationRequests'), requestPayload);
    console.log('Organization join request created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating organization join request:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get pending request by user and organization
const getPendingRequestByUser = async (organizationId, userId) => {
  try {
    const q = query(
      collection(db, 'organizationRequests'),
      where('organizationId', '==', organizationId),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting pending request by user:', error);
    return null;
  }
};

// Get all pending requests for an organization
export const getPendingRequests = async (organizationId, userId) => {
  try {
    if (!organizationId) {
      return [];
    }

    // Verify user has permission (must be admin or owner of organization)
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return [];
    }

    if (organization.ownerId !== userId) {
      // Check if user is admin
      const userProfile = await getUserProfile(userId);
      if (!userProfile || userProfile.organizationId !== organizationId || !userProfile.is_admin) {
        return [];
      }
    }

    const q = query(
      collection(db, 'organizationRequests'),
      where('organizationId', '==', organizationId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const requests = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt
      });
    });

    return requests;
  } catch (error) {
    console.error('Error loading pending requests:', error);
    return [];
  }
};

// Get requests by user (all their requests across organizations)
export const getRequestsByUser = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    const q = query(
      collection(db, 'organizationRequests'),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const requests = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt
      });
    });

    return requests;
  } catch (error) {
    console.error('Error loading user requests:', error);
    return [];
  }
};

// Approve a join request
export const approveRequest = async (requestId, adminUserId) => {
  try {
    if (!requestId || !adminUserId) {
      return { success: false, error: 'Request ID and admin user ID are required' };
    }

    // Get the request
    const requestRef = doc(db, 'organizationRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const requestData = requestSnap.data();
    
    // Verify admin has permission
    const organization = await getOrganizationById(requestData.organizationId);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    if (organization.ownerId !== adminUserId) {
      // Check if user is admin
      const adminProfile = await getUserProfile(adminUserId);
      if (!adminProfile || adminProfile.organizationId !== requestData.organizationId || !adminProfile.is_admin) {
        return { success: false, error: 'Permission denied - only organization admins can approve requests' };
      }
    }

    // Check if request is still pending
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Request has already been processed' };
    }

    // Check if user still doesn't have an organization
    const userProfile = await getUserProfile(requestData.userId);
    if (userProfile?.organizationId) {
      // User already has an organization, reject this request
      await updateDoc(requestRef, {
        status: 'rejected',
        respondedAt: serverTimestamp(),
        respondedBy: adminUserId
      });
      return { success: false, error: 'User already belongs to another organization' };
    }

    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      respondedAt: serverTimestamp(),
      respondedBy: adminUserId
    });

    // Add user to organization
    // Get default workspace for the organization
    const { getWorkspaces } = await import('./workspaces');
    const workspaces = await getWorkspaces(requestData.organizationId);
    const defaultWorkspaceId = workspaces && workspaces.length > 0 ? workspaces[0].id : null;

    await updateUserProfile(requestData.userId, {
      organizationId: requestData.organizationId,
      workspaceIds: defaultWorkspaceId ? [defaultWorkspaceId] : []
    });

    return { success: true };
  } catch (error) {
    console.error('Error approving request:', error);
    return { success: false, error: error.message };
  }
};

// Reject a join request
export const rejectRequest = async (requestId, adminUserId) => {
  try {
    if (!requestId || !adminUserId) {
      return { success: false, error: 'Request ID and admin user ID are required' };
    }

    // Get the request
    const requestRef = doc(db, 'organizationRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const requestData = requestSnap.data();
    
    // Verify admin has permission
    const organization = await getOrganizationById(requestData.organizationId);
    if (!organization) {
      return { success: false, error: 'Organization not found' };
    }

    if (organization.ownerId !== adminUserId) {
      // Check if user is admin
      const adminProfile = await getUserProfile(adminUserId);
      if (!adminProfile || adminProfile.organizationId !== requestData.organizationId || !adminProfile.is_admin) {
        return { success: false, error: 'Permission denied - only organization admins can reject requests' };
      }
    }

    // Check if request is still pending
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Request has already been processed' };
    }

    // Update request status
    await updateDoc(requestRef, {
      status: 'rejected',
      respondedAt: serverTimestamp(),
      respondedBy: adminUserId
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting request:', error);
    return { success: false, error: error.message };
  }
};

// Cancel a join request (by the requester)
export const cancelRequest = async (requestId, userId) => {
  try {
    if (!requestId || !userId) {
      return { success: false, error: 'Request ID and user ID are required' };
    }

    // Get the request
    const requestRef = doc(db, 'organizationRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const requestData = requestSnap.data();
    
    // Verify user owns the request
    if (requestData.userId !== userId) {
      return { success: false, error: 'Permission denied - you can only cancel your own requests' };
    }

    // Check if request is still pending
    if (requestData.status !== 'pending') {
      return { success: false, error: 'Request has already been processed' };
    }

    // Delete the request
    await deleteDoc(requestRef);

    return { success: true };
  } catch (error) {
    console.error('Error canceling request:', error);
    return { success: false, error: error.message };
  }
};

// Get request by ID
export const getRequestById = async (requestId) => {
  try {
    if (!requestId) {
      return null;
    }

    const requestRef = doc(db, 'organizationRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (requestSnap.exists()) {
      const data = requestSnap.data();
      return {
        id: requestSnap.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt,
        respondedAt: data.respondedAt?.toDate?.()?.toISOString() || data.respondedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting request:', error);
    return null;
  }
};

