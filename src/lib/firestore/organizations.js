// Firestore utility functions for organizations
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

// Create a new organization
export const createOrganization = async (organizationData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required to create organization' };
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const organizationPayload = {
      name: organizationData.name || 'My Organization',
      tier: organizationData.tier || 'small_team',
      subscriptionId: null, // Will be set when payment provider is integrated
      subscriptionStatus: 'trialing', // Start with trial
      trialEndsAt: Timestamp.fromDate(trialEndsAt), // Convert to Firestore Timestamp
      currentPeriodStart: serverTimestamp(),
      currentPeriodEnd: null, // Will be set when subscription is active
      workspaceLimit: organizationData.workspaceLimit || 1,
      ownerId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'organizations'), organizationPayload);
    console.log('Organization created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating organization:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get organization by ID
export const getOrganizationById = async (organizationId) => {
  try {
    if (!organizationId) {
      return null;
    }

    const orgRef = doc(db, 'organizations', organizationId);
    const orgSnap = await getDoc(orgRef);
    
    if (orgSnap.exists()) {
      const data = orgSnap.data();
      return {
        id: orgSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        trialEndsAt: data.trialEndsAt?.toDate?.()?.toISOString() || data.trialEndsAt,
        currentPeriodStart: data.currentPeriodStart?.toDate?.()?.toISOString() || data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || data.currentPeriodEnd
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting organization:', error);
    return null;
  }
};

// Get organization by owner ID
export const getOrganizationByOwner = async (userId) => {
  try {
    if (!userId) {
      return null;
    }

    const q = query(
      collection(db, 'organizations'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        trialEndsAt: data.trialEndsAt?.toDate?.()?.toISOString() || data.trialEndsAt,
        currentPeriodStart: data.currentPeriodStart?.toDate?.()?.toISOString() || data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || data.currentPeriodEnd
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting organization by owner:', error);
    return null;
  }
};

// Update organization
export const updateOrganization = async (organizationId, updates, userId) => {
  try {
    if (!organizationId || !userId) {
      return { success: false, error: 'Organization ID and user ID are required' };
    }

    const orgData = await getOrganizationById(organizationId);
    if (!orgData) {
      return { success: false, error: 'Organization not found' };
    }

    // Check permissions (only owner or admin can update)
    if (orgData.ownerId !== userId) {
      // TODO: Check if user is admin of organization
      return { success: false, error: 'Permission denied' };
    }

    const orgRef = doc(db, 'organizations', organizationId);
    await updateDoc(orgRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating organization:', error);
    return { success: false, error: error.message };
  }
};

// Update organization tier (admin function)
export const updateOrganizationTier = async (organizationId, newTier, userId) => {
  try {
    if (!organizationId || !userId) {
      return { success: false, error: 'Organization ID and user ID are required' };
    }

    const orgData = await getOrganizationById(organizationId);
    if (!orgData) {
      return { success: false, error: 'Organization not found' };
    }

    // Check permissions (only owner or admin can update tier)
    if (orgData.ownerId !== userId) {
      return { success: false, error: 'Permission denied' };
    }

    // Import tier config to get workspace limits
    const { TIER_CONFIG, TIERS } = await import('../pricingConstants');
    const tierConfig = TIER_CONFIG[newTier] || TIER_CONFIG[TIERS.SMALL_TEAM];

    const orgRef = doc(db, 'organizations', organizationId);
    await updateDoc(orgRef, {
      tier: newTier,
      workspaceLimit: tierConfig.workspaceLimit,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating organization tier:', error);
    return { success: false, error: error.message };
  }
};

// Get organization members (users with this organizationId)
export const getOrganizationMembers = async (organizationId) => {
  try {
    if (!organizationId) {
      return [];
    }

    const q = query(
      collection(db, 'users'),
      where('organizationId', '==', organizationId)
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
        displayName: data.displayName,
        ...data
      });
    });

    return members;
  } catch (error) {
    console.error('Error getting organization members:', error);
    return [];
  }
};

