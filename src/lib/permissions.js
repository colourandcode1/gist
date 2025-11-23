// Centralized permission checking logic
import { ROLE_PERMISSIONS, ROLES, hasFeature } from './pricingConstants';

/**
 * Check if user is an admin (has is_admin flag on Member role)
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag from user profile
 * @returns {boolean}
 */
export const isAdmin = (role, isAdmin = false) => {
  return role === ROLES.MEMBER && isAdmin === true;
};

// Store reference to avoid shadowing issues when parameter name conflicts with function name
const isAdminCheck = isAdmin;

/**
 * Get permissions for a role
 * @param {string} role - User role (viewer, member)
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {object} Permission object
 */
export const getRolePermissions = (role, isAdmin = false) => {
  const basePermissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
  
  // Use isAdminCheck to avoid parameter shadowing - the parameter 'isAdmin' shadows the function 'isAdmin'
  if (isAdminCheck(role, isAdmin)) {
    return {
      ...basePermissions,
      canManageTeam: true,
      canManageBilling: true,
      canConfigureWorkspacePermissions: true, // Still gated by tier (Enterprise only)
      canBulkOperations: true // Available to all Members
    };
  }
  
  return basePermissions;
};

/**
 * Check if user has a specific permission based on role
 * @param {string} role - User role
 * @param {string} permission - Permission to check (e.g., 'canUploadSessions')
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const hasPermission = (role, permission, isAdmin = false) => {
  const permissions = getRolePermissions(role, isAdmin);
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
 * @param {boolean} isAdmin - is_admin flag (for Member role, not used here but for consistency)
 * @returns {boolean}
 */
export const canUploadSessions = (role, isAdmin = false) => {
  return hasPermission(role, 'canUploadSessions', isAdmin);
};

/**
 * Check if user can create nuggets
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag (for Member role, not used here but for consistency)
 * @returns {boolean}
 */
export const canCreateNuggets = (role, isAdmin = false) => {
  return hasPermission(role, 'canCreateNuggets', isAdmin);
};

/**
 * Check if user can edit nuggets
 * @param {string} role - User role
 * @param {string} nuggetOwnerId - ID of the nugget owner (for checking if user can edit others' nuggets)
 * @param {string} userId - Current user ID
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const canEditNuggets = (role, nuggetOwnerId = null, userId = null, isAdmin = false) => {
  // Members can edit all nuggets
  return hasPermission(role, 'canEditNuggets', isAdmin);
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
 * @param {array} contributors - Array of contributor IDs (for problem space collaborators)
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const canEditProblemSpaces = (role, problemSpaceOwnerId = null, userId = null, contributors = [], isAdmin = false) => {
  // Members can edit all problem spaces
  return hasPermission(role, 'canEditProblemSpaces', isAdmin);
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
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const canManageTeam = (role, isAdmin = false) => {
  // Use isAdminCheck to avoid parameter shadowing
  return isAdminCheck(role, isAdmin);
};

/**
 * Check if user can manage billing
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const canManageBilling = (role, isAdmin = false) => {
  // Use isAdminCheck to avoid parameter shadowing
  return isAdminCheck(role, isAdmin);
};

/**
 * Check if user can configure workspace permissions (Enterprise only, Admin only)
 * @param {string} tier - Organization tier
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag (for Member role)
 * @returns {boolean}
 */
export const canConfigureWorkspacePermissions = (tier, role, isAdmin = false) => {
  // Use isAdminCheck to avoid parameter shadowing
  if (!isAdminCheck(role, isAdmin)) return false;
  return hasFeature(tier, 'workspacePermissions');
};

/**
 * Check if user can configure custom fields
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag (for Member role, not used here but for consistency)
 * @returns {boolean}
 */
export const canConfigureCustomFields = (role, isAdmin = false) => {
  return hasPermission(role, 'canConfigureCustomFields', isAdmin);
};

/**
 * Check if user can perform bulk operations (Available to all Members)
 * @param {string} tier - Organization tier (not used, kept for API consistency)
 * @param {string} role - User role
 * @param {boolean} isAdmin - is_admin flag (not used, kept for API consistency)
 * @returns {boolean}
 */
export const canBulkOperations = (tier, role, isAdmin = false) => {
  // Available to all Members (not just admins)
  return hasPermission(role, 'canBulkOperations', isAdmin);
};

/**
 * Check if user can view dashboard (available to all authenticated users)
 * @param {string} tier - Organization tier (kept for API compatibility, but not used)
 * @returns {boolean}
 */
export const canViewDashboard = (tier) => {
  // Dashboard is available to all authenticated users regardless of tier
  return true;
};

/**
 * Check if organization can use SSO
 * @param {string} tier - Organization tier
 * @returns {boolean}
 */
export const canUseSSO = (tier) => {
  return hasFeature(tier, 'sso');
};

