/**
 * Organization Data Validation Utilities
 * 
 * Provides validation functions to ensure data integrity in the organization/workspace structure.
 * These functions can be used as middleware or validation checks before operations.
 */

import { 
  getUserProfile, 
  getOrganizationById, 
  getOrganizationMembers 
} from './firestoreUtils';
import { getWorkspaceById } from './firestore/workspaces';

/**
 * Validates that a user belongs to an organization
 * @param {string} userId - User ID to validate
 * @param {string} organizationId - Organization ID to check against
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateUserInOrganization = async (userId, organizationId) => {
  try {
    if (!userId || !organizationId) {
      return { valid: false, error: 'User ID and Organization ID are required' };
    }

    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return { valid: false, error: 'User not found' };
    }

    if (userProfile.organizationId !== organizationId) {
      return { valid: false, error: 'User does not belong to this organization' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating user in organization:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Validates that a workspace belongs to an organization
 * @param {string} workspaceId - Workspace ID to validate
 * @param {string} organizationId - Organization ID to check against
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateWorkspaceInOrganization = async (workspaceId, organizationId) => {
  try {
    if (!workspaceId || !organizationId) {
      return { valid: false, error: 'Workspace ID and Organization ID are required' };
    }

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return { valid: false, error: 'Workspace not found' };
    }

    if (workspace.organizationId !== organizationId) {
      return { valid: false, error: 'Workspace does not belong to this organization' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating workspace in organization:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Validates that a resource (session, project, theme) belongs to the user's organization
 * @param {string} resourceId - Resource ID to validate
 * @param {string} collection - Collection name ('sessions', 'projects', 'themes')
 * @param {string} userId - User ID to check against
 * @returns {Promise<{valid: boolean, error?: string, resource?: object}>}
 */
export const validateResourceInUserOrganization = async (resourceId, collection, userId) => {
  try {
    if (!resourceId || !collection || !userId) {
      return { valid: false, error: 'Resource ID, collection, and user ID are required' };
    }

    const validCollections = ['sessions', 'projects', 'themes'];
    if (!validCollections.includes(collection)) {
      return { valid: false, error: `Invalid collection: ${collection}` };
    }

    // Get resource
    const { db } = await import('./firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    const resourceDoc = await getDoc(doc(db, collection, resourceId));

    if (!resourceDoc.exists()) {
      return { valid: false, error: 'Resource not found' };
    }

    const resource = resourceDoc.data();

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.organizationId) {
      return { valid: false, error: 'User does not belong to an organization' };
    }

    // If resource has workspaceId, validate it belongs to user's organization
    if (resource.workspaceId) {
      const workspaceValidation = await validateWorkspaceInOrganization(
        resource.workspaceId,
        userProfile.organizationId
      );
      if (!workspaceValidation.valid) {
        return { valid: false, error: workspaceValidation.error };
      }
    } else {
      // If resource doesn't have workspaceId, check if userId matches
      const resourceUserId = resource.userId || resource.createdBy;
      if (resourceUserId !== userId) {
        return { valid: false, error: 'Resource does not belong to user' };
      }
    }

    return { valid: true, resource: { id: resourceDoc.id, ...resource } };
  } catch (error) {
    console.error('Error validating resource in user organization:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Validates that a user has access to a workspace
 * @param {string} userId - User ID to validate
 * @param {string} workspaceId - Workspace ID to check
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateUserWorkspaceAccess = async (userId, workspaceId) => {
  try {
    if (!userId || !workspaceId) {
      return { valid: false, error: 'User ID and Workspace ID are required' };
    }

    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return { valid: false, error: 'User not found' };
    }

    // Check if user has workspaceId in their workspaceIds array
    if (userProfile.workspaceIds && userProfile.workspaceIds.includes(workspaceId)) {
      return { valid: true };
    }

    // If not in array, check if workspace belongs to user's organization
    if (userProfile.organizationId) {
      const workspaceValidation = await validateWorkspaceInOrganization(
        workspaceId,
        userProfile.organizationId
      );
      if (workspaceValidation.valid) {
        return { valid: true };
      }
    }

    return { valid: false, error: 'User does not have access to this workspace' };
  } catch (error) {
    console.error('Error validating user workspace access:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Validates organization data integrity
 * @param {string} organizationId - Organization ID to validate
 * @returns {Promise<{valid: boolean, issues: Array, errors: Array}>}
 */
export const validateOrganizationIntegrity = async (organizationId) => {
  const issues = [];
  const errors = [];

  try {
    if (!organizationId) {
      return { valid: false, issues: ['Organization ID is required'], errors: [] };
    }

    // Check organization exists
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return { valid: false, issues: ['Organization not found'], errors: [] };
    }

    // Check organization has at least one workspace
    const { getWorkspaces } = await import('./firestoreUtils');
    const workspaces = await getWorkspaces(organizationId);
    if (!workspaces || workspaces.length === 0) {
      issues.push('Organization has no workspaces');
    }

    // Check organization has at least one member
    const members = await getOrganizationMembers(organizationId);
    if (!members || members.length === 0) {
      issues.push('Organization has no members');
    }

    // Check organization has an owner
    if (!organization.ownerId) {
      issues.push('Organization has no owner');
    } else {
      // Validate owner is a member
      const ownerIsMember = members.some(m => m.id === organization.ownerId);
      if (!ownerIsMember) {
        issues.push('Organization owner is not a member');
      }
    }

    // Check for at least one admin
    const admins = members.filter(m => m.role === 'member' && m.is_admin === true);
    if (admins.length === 0) {
      issues.push('Organization has no administrators');
    }

    return {
      valid: issues.length === 0,
      issues,
      errors
    };
  } catch (error) {
    console.error('Error validating organization integrity:', error);
    errors.push(error.message);
    return { valid: false, issues, errors };
  }
};

/**
 * Validates that a resource's workspaceId is valid and belongs to the user's organization
 * @param {object} resource - Resource object (session, project, theme)
 * @param {string} userId - User ID
 * @returns {Promise<{valid: boolean, error?: string, workspaceId?: string}>}
 */
export const validateAndAssignWorkspace = async (resource, userId) => {
  try {
    if (!userId) {
      return { valid: false, error: 'User ID is required' };
    }

    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return { valid: false, error: 'User not found' };
    }

    // If resource already has workspaceId, validate it
    if (resource.workspaceId) {
      const validation = await validateWorkspaceInOrganization(
        resource.workspaceId,
        userProfile.organizationId
      );
      if (validation.valid) {
        return { valid: true, workspaceId: resource.workspaceId };
      }
      // If invalid, fall through to assign new workspace
    }

    // Assign default workspace
    if (userProfile.workspaceIds && userProfile.workspaceIds.length > 0) {
      return { valid: true, workspaceId: userProfile.workspaceIds[0] };
    }

    // If user has no workspaceIds, try to get from organization
    if (userProfile.organizationId) {
      const { getWorkspaces } = await import('./firestore/workspaces');
      const workspaces = await getWorkspaces(userProfile.organizationId);
      if (workspaces && workspaces.length > 0) {
        return { valid: true, workspaceId: workspaces[0].id };
      }
    }

    return { valid: false, error: 'User has no accessible workspace' };
  } catch (error) {
    console.error('Error validating and assigning workspace:', error);
    return { valid: false, error: error.message };
  }
};

