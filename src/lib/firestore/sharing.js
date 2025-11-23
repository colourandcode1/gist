// Firestore utility functions for sharing
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
import { getProblemSpaceById } from './problemSpaces';

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
