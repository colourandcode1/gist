// Firestore utility functions for activities
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
import { getUserProfile } from './users';

// Create an activity
export const createActivity = async (activityData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const activityPayload = {
      type: activityData.type, // 'insight_added', 'comment', 'theme_updated', 'project_changed'
      themeId: activityData.themeId || null,
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

// Get activities for a theme
export const getActivities = async (themeId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'activities'),
      where('themeId', '==', themeId),
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
        'create': ['session_created', 'project_created', 'theme_created', 'insight_added'],
        'update': ['session_updated', 'project_updated', 'theme_updated', 'insight_updated'],
        'delete': ['session_deleted', 'project_deleted', 'theme_deleted', 'insight_deleted'],
        'view': ['session_viewed', 'project_viewed', 'theme_viewed']
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
        'theme': 'themeId',
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
          'theme': 'themeId',
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
        'theme_created': 'Create',
        'theme_updated': 'Update',
        'theme_deleted': 'Delete',
        'theme_viewed': 'View',
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
        'theme_created': 'Theme',
        'theme_updated': 'Theme',
        'theme_deleted': 'Theme',
        'theme_viewed': 'Theme',
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
