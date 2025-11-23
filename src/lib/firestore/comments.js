// Firestore utility functions for comments
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

// Create a comment
export const createComment = async (commentData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const commentPayload = {
      themeId: commentData.themeId,
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

// Get comments for a theme (and optionally a specific insight)
export const getComments = async (themeId, insightId = null) => {
  try {
    // Fetch all comments for the theme
    const q = query(
      collection(db, 'comments'),
      where('themeId', '==', themeId),
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
