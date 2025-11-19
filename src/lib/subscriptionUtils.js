// Subscription and seat management utilities
import { TIER_CONFIG, TIERS, TRIAL_PERIOD_DAYS } from './pricingConstants';

/**
 * Check if organization has available researcher seats
 * @param {object} organization - Organization document
 * @returns {boolean}
 */
export const hasAvailableResearcherSeats = (organization) => {
  if (!organization) return false;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
  const included = organization.researcherSeatsIncluded || tierConfig.researcherSeatsIncluded;
  const used = organization.researcherSeatsUsed || 0;
  
  return used < included;
};

/**
 * Check if organization has available contributor seats (only relevant for Starter tier)
 * @param {object} organization - Organization document
 * @param {number} currentContributorCount - Current number of contributors
 * @returns {boolean}
 */
export const hasAvailableContributorSeats = (organization, currentContributorCount) => {
  if (!organization) return false;
  
  // Team and Enterprise have unlimited contributors
  if (organization.tier === TIERS.TEAM || organization.tier === TIERS.ENTERPRISE) {
    return true;
  }
  
  // Starter tier - check if we can add more (no hard limit, but each costs $8/month)
  // For now, we'll allow unlimited but track usage for billing
  return true;
};

/**
 * Calculate additional researcher seats needed
 * @param {object} organization - Organization document
 * @returns {number}
 */
export const getAdditionalResearcherSeats = (organization) => {
  if (!organization) return 0;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
  const included = organization.researcherSeatsIncluded || tierConfig.researcherSeatsIncluded;
  const used = organization.researcherSeatsUsed || 0;
  
  return Math.max(0, used - included);
};

/**
 * Calculate monthly cost for additional seats
 * @param {object} organization - Organization document
 * @returns {number}
 */
export const calculateAdditionalSeatCost = (organization) => {
  if (!organization) return 0;
  
  const additionalSeats = getAdditionalResearcherSeats(organization);
  if (additionalSeats === 0) return 0;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
  return additionalSeats * tierConfig.researcherSeatPrice;
};

/**
 * Check if organization can create more workspaces
 * @param {object} organization - Organization document
 * @param {number} currentWorkspaceCount - Current number of workspaces
 * @returns {boolean}
 */
export const canCreateWorkspace = (organization, currentWorkspaceCount) => {
  if (!organization) return false;
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
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
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
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
 * Get seat usage summary
 * @param {object} organization - Organization document
 * @returns {object}
 */
export const getSeatUsage = (organization) => {
  if (!organization) {
    return {
      researcherSeatsUsed: 0,
      researcherSeatsIncluded: 1,
      researcherSeatsAvailable: 1,
      contributorSeatsUsed: 0,
      contributorSeatsUnlimited: false
    };
  }
  
  const tierConfig = TIER_CONFIG[organization.tier] || TIER_CONFIG[TIERS.STARTER];
  const researcherSeatsIncluded = organization.researcherSeatsIncluded || tierConfig.researcherSeatsIncluded;
  const researcherSeatsUsed = organization.researcherSeatsUsed || 0;
  const contributorSeatsUsed = organization.contributorSeatsUsed || 0;
  const contributorSeatsUnlimited = organization.tier === TIERS.TEAM || organization.tier === TIERS.ENTERPRISE;
  
  return {
    researcherSeatsUsed,
    researcherSeatsIncluded,
    researcherSeatsAvailable: Math.max(0, researcherSeatsIncluded - researcherSeatsUsed),
    contributorSeatsUsed,
    contributorSeatsUnlimited
  };
};

