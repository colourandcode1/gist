// Pricing tier configurations and constants

export const TIERS = {
  STARTER: 'starter',
  TEAM: 'team',
  ENTERPRISE: 'enterprise'
};

export const ROLES = {
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  RESEARCHER: 'researcher',
  ADMIN: 'admin'
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due'
};

// Tier configurations
export const TIER_CONFIG = {
  [TIERS.STARTER]: {
    name: 'Starter',
    price: 29, // USD per month
    researcherSeatsIncluded: 1,
    researcherSeatPrice: 20, // Additional seats
    contributorSeatPrice: 8, // Per contributor seat
    workspaceLimit: 1,
    features: {
      dashboard: false,
      sso: true,
      workspacePermissions: false,
      bulkOperations: false,
      customAuditRetention: false,
      unlimitedContributors: false
    }
  },
  [TIERS.TEAM]: {
    name: 'Team',
    price: 149, // USD per month
    researcherSeatsIncluded: 5,
    researcherSeatPrice: 18, // Additional seats
    contributorSeatPrice: 0, // Free on Team+
    workspaceLimit: 5,
    features: {
      dashboard: true,
      sso: true,
      workspacePermissions: false,
      bulkOperations: false,
      customAuditRetention: false,
      unlimitedContributors: true
    }
  },
  [TIERS.ENTERPRISE]: {
    name: 'Enterprise',
    price: 349, // USD per month
    researcherSeatsIncluded: 10,
    researcherSeatPrice: 15, // Additional seats
    contributorSeatPrice: 0, // Free on Team+
    workspaceLimit: null, // Unlimited
    features: {
      dashboard: true,
      sso: true,
      workspacePermissions: true,
      bulkOperations: true,
      customAuditRetention: true,
      unlimitedContributors: true
    }
  }
};

// Role permissions matrix
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
  [ROLES.CONTRIBUTOR]: {
    canView: true,
    canUploadSessions: false,
    canCreateNuggets: true,
    canEditNuggets: false, // Can only edit own nuggets
    canEditOthersNuggets: false,
    canCreateProblemSpaces: true,
    canEditProblemSpaces: true, // Own problem spaces
    canComment: true,
    canCreateProjects: false,
    canManageTeam: false,
    canManageBilling: false,
    canConfigureWorkspacePermissions: false,
    canConfigureCustomFields: false,
    canBulkOperations: false
  },
  [ROLES.RESEARCHER]: {
    canView: true,
    canUploadSessions: true,
    canCreateNuggets: true,
    canEditNuggets: true,
    canEditOthersNuggets: true,
    canCreateProblemSpaces: true,
    canEditProblemSpaces: true,
    canComment: true,
    canCreateProjects: true,
    canManageTeam: false,
    canManageBilling: false,
    canConfigureWorkspacePermissions: false,
    canConfigureCustomFields: true,
    canBulkOperations: false
  },
  [ROLES.ADMIN]: {
    canView: true,
    canUploadSessions: true,
    canCreateNuggets: true,
    canEditNuggets: true,
    canEditOthersNuggets: true,
    canCreateProblemSpaces: true,
    canEditProblemSpaces: true,
    canComment: true,
    canCreateProjects: true,
    canManageTeam: true,
    canManageBilling: true,
    canConfigureWorkspacePermissions: true, // Enterprise only
    canConfigureCustomFields: true,
    canBulkOperations: true // Enterprise only
  }
};

// Helper functions
export const getTierConfig = (tier) => {
  return TIER_CONFIG[tier] || TIER_CONFIG[TIERS.STARTER];
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

