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
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

// Helper function to generate subdomain from organization name
const generateSubdomain = (name) => {
  if (!name) return null;
  // Convert to lowercase, replace spaces and special chars with hyphens, remove invalid chars
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric (except hyphens) with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit to 50 chars
};

// Helper function to validate subdomain
const validateSubdomain = (subdomain) => {
  if (!subdomain) return { valid: false, error: 'Subdomain is required' };
  if (subdomain.length < 3) return { valid: false, error: 'Subdomain must be at least 3 characters' };
  if (subdomain.length > 50) return { valid: false, error: 'Subdomain must be 50 characters or less' };
  if (!/^[a-z0-9-]+$/.test(subdomain)) return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) return { valid: false, error: 'Subdomain cannot start or end with a hyphen' };
  return { valid: true };
};

// Check if subdomain is available
// Uses Cloud Function to check availability without requiring authentication
export const isSubdomainAvailable = async (subdomain) => {
  try {
    // If subdomain is empty/null, it's optional so return true
    if (!subdomain || subdomain.trim() === '') {
      return true;
    }
    
    // Normalize subdomain
    const normalized = subdomain.toLowerCase().trim();
    
    // Call Cloud Function to check availability
    const checkSubdomainAvailability = httpsCallable(functions, 'checkSubdomainAvailability');
    const result = await checkSubdomainAvailability({ subdomain: normalized });
    
    const { available, error } = result.data;
    
    // If there's a validation error, throw it so the UI can handle it
    if (error && !available) {
      // Check if it's a validation error (format issue) vs availability error
      const validationErrors = [
        'Subdomain must be at least 3 characters',
        'Subdomain must be 50 characters or less',
        'Subdomain can only contain lowercase letters, numbers, and hyphens',
        'Subdomain cannot start or end with a hyphen'
      ];
      
      if (validationErrors.some(msg => error.includes(msg))) {
        // This is a validation error - throw it so UI can show proper message
        throw new Error(error);
      }
    }
    
    return available === true;
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    
    // If it's a validation error, re-throw it
    if (error.message && (
      error.message.includes('Subdomain') || 
      error.message.includes('subdomain')
    )) {
      throw error;
    }
    
    // For other errors (network, etc.), throw a generic error
    throw new Error('Error checking subdomain availability. Please try again.');
  }
};

// Create a new organization
export const createOrganization = async (organizationData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required to create organization' };
    }

    // Generate or validate subdomain
    let subdomain = organizationData.subdomain;
    if (!subdomain && organizationData.name) {
      // Auto-generate from name
      subdomain = generateSubdomain(organizationData.name);
      // If generated subdomain is too short, append random chars
      if (subdomain && subdomain.length < 3) {
        subdomain = subdomain + '-' + Math.random().toString(36).substring(2, 5);
      }
    }

    if (subdomain) {
      subdomain = subdomain.toLowerCase().trim();
      const validation = validateSubdomain(subdomain);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if subdomain is available
      // For local development, if Cloud Function fails, we'll check directly in Firestore
      try {
        const available = await isSubdomainAvailable(subdomain);
        if (!available) {
          return { success: false, error: 'This subdomain is already taken. Please choose another.' };
        }
      } catch (error) {
        // If Cloud Function is unavailable (e.g., local development), check directly in Firestore
        console.warn('Cloud Function unavailable, checking subdomain directly in Firestore:', error.message);
        try {
          const existingOrg = await getOrganizationBySubdomain(subdomain);
          if (existingOrg) {
            return { success: false, error: 'This subdomain is already taken. Please choose another.' };
          }
          // Subdomain is available (no existing org found), continue
        } catch (firestoreError) {
          // If direct check also fails, we'll proceed anyway
          // Uniqueness will be enforced at the database level if there's a unique index
          console.warn('Could not verify subdomain availability, proceeding anyway:', firestoreError.message);
        }
      }
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const organizationPayload = {
      name: organizationData.name || 'My Organization',
      subdomain: subdomain || null, // Unique subdomain for organization lookup
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

// Get organization by subdomain
export const getOrganizationBySubdomain = async (subdomain) => {
  try {
    if (!subdomain) {
      return null;
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();
    const q = query(
      collection(db, 'organizations'),
      where('subdomain', '==', normalizedSubdomain)
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
    console.error('Error getting organization by subdomain:', error);
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
      // Check if user is admin of organization
      const { getUserProfile } = await import('./users');
      const userProfile = await getUserProfile(userId);
      if (!userProfile || userProfile.organizationId !== organizationId || !userProfile.is_admin) {
        return { success: false, error: 'Permission denied - only organization admins can update settings' };
      }
    }

    // If subdomain is being updated, validate it
    if (updates.subdomain !== undefined) {
      const newSubdomain = updates.subdomain ? updates.subdomain.toLowerCase().trim() : null;
      
      if (newSubdomain) {
        const validation = validateSubdomain(newSubdomain);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        // Check if subdomain is available (excluding current organization)
        const existingOrg = await getOrganizationBySubdomain(newSubdomain);
        if (existingOrg && existingOrg.id !== organizationId) {
          return { success: false, error: 'This subdomain is already taken. Please choose another.' };
        }
      }
      
      updates.subdomain = newSubdomain;
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

