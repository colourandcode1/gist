// Firestore utility functions for subscriptions
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

// Create a subscription
export const createSubscription = async (subscriptionData, organizationId) => {
  try {
    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    const subscriptionPayload = {
      organizationId,
      tier: subscriptionData.tier || 'small_team',
      status: subscriptionData.status || 'trialing',
      paymentProvider: null, // Will be 'lemonsqueezy' when integrated
      paymentProviderSubscriptionId: null, // LemonSqueezy subscription ID
      paymentProviderCustomerId: null, // LemonSqueezy customer ID
      currentPeriodStart: serverTimestamp(),
      currentPeriodEnd: null, // Will be set when subscription is active
      cancelAtPeriodEnd: false,
      trialEndsAt: subscriptionData.trialEndsAt 
        ? (subscriptionData.trialEndsAt instanceof Date 
          ? Timestamp.fromDate(subscriptionData.trialEndsAt) 
          : subscriptionData.trialEndsAt)
        : null,
      seats: subscriptionData.seats || 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'subscriptions'), subscriptionPayload);
    console.log('Subscription created successfully with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

// Get subscription by organization ID
export const getSubscriptionByOrganization = async (organizationId) => {
  try {
    if (!organizationId) {
      return null;
    }

    const q = query(
      collection(db, 'subscriptions'),
      where('organizationId', '==', organizationId),
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
        currentPeriodStart: data.currentPeriodStart?.toDate?.()?.toISOString() || data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || data.currentPeriodEnd,
        trialEndsAt: data.trialEndsAt?.toDate?.()?.toISOString() || data.trialEndsAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

// Get subscription by ID
export const getSubscriptionById = async (subscriptionId) => {
  try {
    if (!subscriptionId) {
      return null;
    }

    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      const data = subscriptionSnap.data();
      return {
        id: subscriptionSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        currentPeriodStart: data.currentPeriodStart?.toDate?.()?.toISOString() || data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || data.currentPeriodEnd,
        trialEndsAt: data.trialEndsAt?.toDate?.()?.toISOString() || data.trialEndsAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

// Update subscription
export const updateSubscription = async (subscriptionId, updates) => {
  try {
    if (!subscriptionId) {
      return { success: false, error: 'Subscription ID is required' };
    }

    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    await updateDoc(subscriptionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

// Update subscription status (for webhook handlers)
export const updateSubscriptionStatus = async (subscriptionId, status, additionalData = {}) => {
  try {
    if (!subscriptionId) {
      return { success: false, error: 'Subscription ID is required' };
    }

    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    await updateDoc(subscriptionRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return { success: false, error: error.message };
  }
};
