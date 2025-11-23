// Pricing tier configurations and constants

export const TIERS = {
  SMALL_TEAM: 'small_team',
  TEAM: 'team',
  ENTERPRISE: 'enterprise'
};

export const ROLES = {
  VIEWER: 'viewer',
  MEMBER: 'member',
  ADMIN: 'admin' // Note: Admin is now a permission flag (is_admin) on Member role
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due'
};

// Tier configurations
export const TIER_CONFIG = {
  [TIERS.SMALL_TEAM]: {
    name: 'Small Team',
    price: 49, // USD per month
    teamSizeRange: '1-5 people',
    workspaceLimit: 3,
    features: {
      dashboard: true,
      sso: true,
      workspacePermissions: false,
      bulkOperations: true,
      customAuditRetention: false
    }
  },
  [TIERS.TEAM]: {
    name: 'Team',
    price: 149, // USD per month
    teamSizeRange: '6-15 people',
    workspaceLimit: 10,
    features: {
      dashboard: true,
      sso: true,
      workspacePermissions: false,
      bulkOperations: true,
      customAuditRetention: false
    }
  },
  [TIERS.ENTERPRISE]: {
    name: 'Enterprise',
    price: 399, // USD per month
    teamSizeRange: '16+ people',
    workspaceLimit: null, // Unlimited
    features: {
      dashboard: true,
      sso: true,
      workspacePermissions: true,
      bulkOperations: true,
      customAuditRetention: true
    }
  }
};

// Role permissions matrix
// Note: Admin permissions are handled via is_admin flag on Member role
export const ROLE_PERMISSIONS = {
  [ROLES.VIEWER]: {
    canView: true,
    canUploadSessions: false,
    canCreateNuggets: false,
    canEditNuggets: false,
    canEditOthersNuggets: false,
    canCreateProblemSpaces: false,
    canEditProblemSpaces: false,
    canComment: false,
    canCreateProjects: false,
    canManageTeam: false,
    canManageBilling: false,
    canConfigureWorkspacePermissions: false,
    canConfigureCustomFields: false,
    canBulkOperations: false
  },
  [ROLES.MEMBER]: {
    canView: true,
    canUploadSessions: true,
    canCreateNuggets: true,
    canEditNuggets: true,
    canEditOthersNuggets: true,
    canCreateProblemSpaces: true,
    canEditProblemSpaces: true,
    canComment: true,
    canCreateProjects: true,
    canManageTeam: false, // Admin only (checked via is_admin flag)
      canManageBilling: false, // Admin only (checked via is_admin flag)
      canConfigureWorkspacePermissions: false, // Admin only, Enterprise tier (checked via is_admin flag)
      canConfigureCustomFields: true,
      canBulkOperations: true // Available to all Members
  }
  // Admin permissions are Member permissions + admin-specific permissions
  // Checked via is_admin flag in permission functions
};

// Helper functions
export const getTierConfig = (tier) => {
  return TIER_CONFIG[tier] || TIER_CONFIG[TIERS.SMALL_TEAM];
};

export const hasFeature = (tier, feature) => {
  const config = getTierConfig(tier);
  return config.features[feature] || false;
};

export const getWorkspaceLimit = (tier) => {
  const config = getTierConfig(tier);
  return config.workspaceLimit; // null means unlimited
};

export const canUseFeature = (tier, role, feature) => {
  // Check if tier has the feature
  if (!hasFeature(tier, feature)) {
    return false;
  }
  
  // Check if role has the permission
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
  return permissions[feature] || false;
};

// Trial period configuration
export const TRIAL_PERIOD_DAYS = 14;

