// Re-export all functions from domain modules for backward compatibility
// This allows existing imports from '@/lib/firestoreUtils' to continue working

// Sessions
export {
  saveSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  getSessionsByProject
} from './sessions';

// Nuggets
export {
  getAllNuggets,
  getNuggetsBySessionId,
  updateNuggetCategoryTags,
  updateNuggetFields,
  deleteNugget
} from './nuggets';

// Projects
export {
  createProject,
  getProjects,
  getProjectsByStatus,
  getProjectById,
  updateProject,
  deleteProject
} from './projects';

// Themes
export {
  createTheme,
  getThemes,
  getThemeById,
  updateTheme,
  addInsightToTheme,
  removeInsightFromTheme,
  updateThemePrivacy,
  deleteTheme
} from './themes';

// Comments
export {
  createComment,
  getComments,
  updateComment,
  deleteComment
} from './comments';

// Users
export {
  getUserProfile,
  updateUserProfile
} from './users';

// Sharing
export {
  createShareLink,
  getShareLinkByToken,
  getShareLinks,
  deleteShareLink
} from './sharing';

// Teams
export {
  getTeamMembers,
  inviteTeamMember,
  getPendingInvitations,
  updateMemberRole,
  removeTeamMember,
  createTeam,
  updateTeamSettings,
  getUserTeams
} from './teams';

// Research Configuration
export {
  getResearchConfiguration,
  updateResearchConfiguration
} from './researchConfig';

// Privacy & Security
export {
  getPrivacySecuritySettings,
  updatePrivacySecuritySettings
} from './privacySecurity';

// Activities
export {
  createActivity,
  getActivities,
  getProjectActivities,
  getAuditLogs
} from './activities';

// Integrations
export {
  getIntegrations,
  updateIntegration
} from './integrations';

// Organizations
export {
  createOrganization,
  getOrganizationById,
  getOrganizationByOwner,
  updateOrganization,
  updateOrganizationTier,
  getOrganizationMembers
} from './organizations';

// Workspaces
export {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  setWorkspacePermissions,
  getWorkspacePermissions,
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember
} from './workspaces';

// Subscriptions
export {
  createSubscription,
  getSubscriptionByOrganization,
  getSubscriptionById,
  updateSubscription,
  updateSubscriptionStatus
} from './subscriptions';

