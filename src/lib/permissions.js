// Centralized permission checking logic
import { ROLE_PERMISSIONS, ROLES, hasFeature } from './pricingConstants';

/**
 * Get permissions for a role
 * @param {string} role - User role (viewer, contributor, researcher, admin)
 * @returns {object} Permission object
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
};

/**
 * Check if user has a specific permission based on role
 * @param {string} role - User role
 * @param {string} permission - Permission to check (e.g., 'canUploadSessions')
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions[permission] || false;
};

/**
 * Check if user can use a feature based on tier and role
 * @param {string} tier - Organization tier (starter, team, enterprise)
 * @param {string} role - User role
 * @param {string} feature - Feature name (e.g., 'dashboard', 'sso')
 * @returns {boolean}
 */
export const canUseFeature = (tier, role, feature) => {
  // First check if tier has the feature
  if (!hasFeature(tier, feature)) {
    return false;
  }
  
  // Then check if role has the permission
  return hasPermission(role, feature);
};

/**
 * Check if user can upload sessions
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canUploadSessions = (role) => {
  return hasPermission(role, 'canUploadSessions');
};

/**
 * Check if user can create nuggets
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canCreateNuggets = (role) => {
  return hasPermission(role, 'canCreateNuggets');
};

/**
 * Check if user can edit nuggets
 * @param {string} role - User role
 * @param {string} nuggetOwnerId - ID of the nugget owner (for checking if user can edit others' nuggets)
 * @param {string} userId - Current user ID
 * @returns {boolean}
 */
export const canEditNuggets = (role, nuggetOwnerId = null, userId = null) => {
  // Contributors can only edit their own nuggets
  if (role === ROLES.CONTRIBUTOR) {
    return nuggetOwnerId === userId;
  }
  
  // Researchers and admins can edit all nuggets
  return hasPermission(role, 'canEditNuggets');
};

/**
 * Check if user can edit others' nuggets
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canEditOthersNuggets = (role) => {
  return hasPermission(role, 'canEditOthersNuggets');
};

/**
 * Check if user can create problem spaces
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canCreateProblemSpaces = (role) => {
  return hasPermission(role, 'canCreateProblemSpaces');
};

/**
 * Check if user can edit problem spaces
 * @param {string} role - User role
 * @param {string} problemSpaceOwnerId - ID of the problem space owner
 * @param {string} userId - Current user ID
 * @param {array} contributors - Array of contributor IDs
 * @returns {boolean}
 */
export const canEditProblemSpaces = (role, problemSpaceOwnerId = null, userId = null, contributors = []) => {
  // Contributors can edit problem spaces they own or contribute to
  if (role === ROLES.CONTRIBUTOR) {
    return problemSpaceOwnerId === userId || contributors.includes(userId);
  }
  
  // Researchers and admins can edit all problem spaces
  return hasPermission(role, 'canEditProblemSpaces');
};

/**
 * Check if user can comment
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canComment = (role) => {
  return hasPermission(role, 'canComment');
};

/**
 * Check if user can create projects
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canCreateProjects = (role) => {
  return hasPermission(role, 'canCreateProjects');
};

/**
 * Check if user can manage team
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canManageTeam = (role) => {
  return hasPermission(role, 'canManageTeam');
};

/**
 * Check if user can manage billing
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canManageBilling = (role) => {
  return hasPermission(role, 'canManageBilling');
};

/**
 * Check if user can configure workspace permissions (Enterprise only)
 * @param {string} tier - Organization tier
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canConfigureWorkspacePermissions = (tier, role) => {
  return canUseFeature(tier, role, 'workspacePermissions');
};

/**
 * Check if user can configure custom fields
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canConfigureCustomFields = (role) => {
  return hasPermission(role, 'canConfigureCustomFields');
};

/**
 * Check if user can perform bulk operations (Enterprise only)
 * @param {string} tier - Organization tier
 * @param {string} role - User role
 * @returns {boolean}
 */
export const canBulkOperations = (tier, role) => {
  return canUseFeature(tier, role, 'bulkOperations');
};

/**
 * Check if user can view dashboard (Team+ only)
 * @param {string} tier - Organization tier
 * @returns {boolean}
 */
export const canViewDashboard = (tier) => {
  return hasFeature(tier, 'dashboard');
};

/**
 * Check if organization can use SSO
 * @param {string} tier - Organization tier
 * @returns {boolean}
 */
export const canUseSSO = (tier) => {
  return hasFeature(tier, 'sso');
};

