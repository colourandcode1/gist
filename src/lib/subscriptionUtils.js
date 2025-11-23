// Subscription and team size management utilities
import { TIER_CONFIG, TIERS, TRIAL_PERIOD_DAYS } from './pricingConstants';

/**
 * Calculate appropriate tier based on team size
 * @param {number} teamSize - Number of members in the organization
 * @returns {string} Tier name
 */
export const calculateTierFromTeamSize = (teamSize) => {
  if (teamSize <= 5) {
    return TIERS.SMALL_TEAM;
  } else if (teamSize <= 15) {
    return TIERS.TEAM;
  } else {
    return TIERS.ENTERPRISE;
  }
};

/**
 * Check if organization can create more workspaces
 * @param {object} organization - Organization document
 * @param {number} currentWorkspaceCount - Current number of workspaces
 * @returns {boolean}
 */
export const canCreateWorkspace = (organization, currentWorkspaceCount) => {
  if (!organization) return false;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.SMALL_TEAM];
  const limit = tierConfig.workspaceLimit;
  
  // null means unlimited (Enterprise)
  if (limit === null) return true;
  
  return currentWorkspaceCount < limit;
};

/**
 * Get workspace limit for organization
 * @param {object} organization - Organization document
 * @returns {number|null} - null means unlimited
 */
export const getWorkspaceLimit = (organization) => {
  if (!organization) return 1;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.SMALL_TEAM];
  return tierConfig.workspaceLimit;
};

/**
 * Check if organization is in trial period
 * @param {object} organization - Organization document
 * @returns {boolean}
 */
export const isInTrialPeriod = (organization) => {
  if (!organization || !organization.trialEndsAt) return false;
  
  const trialEnd = organization.trialEndsAt?.toDate ? organization.trialEndsAt.toDate() : new Date(organization.trialEndsAt);
  return new Date() < trialEnd && organization.subscriptionStatus === 'trialing';
};

/**
 * Get remaining trial days
 * @param {object} organization - Organization document
 * @returns {number}
 */
export const getTrialDaysRemaining = (organization) => {
  if (!isInTrialPeriod(organization)) return 0;
  
  const trialEnd = organization.trialEndsAt?.toDate ? organization.trialEndsAt.toDate() : new Date(organization.trialEndsAt);
  const now = new Date();
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

/**
 * Calculate trial end date (14 days from now)
 * @returns {Date}
 */
export const calculateTrialEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_PERIOD_DAYS);
  return date;
};

/**
 * Get team size and tier information
 * @param {object} organization - Organization document
 * @param {number} teamSize - Current team size (number of members)
 * @returns {object}
 */
export const getTeamInfo = (organization, teamSize = 0) => {
  if (!organization) {
    return {
      teamSize: 0,
      currentTier: TIERS.SMALL_TEAM,
      recommendedTier: TIERS.SMALL_TEAM,
      tierConfig: TIER_CONFIG[TIERS.SMALL_TEAM]
    };
  }
  
  const currentTier = organization.tier || TIERS.SMALL_TEAM;
  const recommendedTier = calculateTierFromTeamSize(teamSize);
  const tierConfig = TIER_CONFIG[currentTier] || TIER_CONFIG[TIERS.SMALL_TEAM];
  
  return {
    teamSize,
    currentTier,
    recommendedTier,
    tierConfig,
    shouldUpgrade: recommendedTier !== currentTier && 
      (recommendedTier === TIERS.TEAM || recommendedTier === TIERS.ENTERPRISE)
  };
};

