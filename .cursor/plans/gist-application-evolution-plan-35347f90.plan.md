<!-- 35347f90-7db2-4179-bc76-2845a873a7da 90cfe7c5-107f-48f7-bc8d-2d5538ae1a41 -->
# Gist Application Evolution Plan

## Current State Assessment

**Completed (Phases 1-5):**

- ✅ Projects feature (full CRUD, list view, detail view with tabs)
- ✅ Enhanced Sessions (list view with filtering, detail view with transcript editing)
- ✅ Enhanced participant context fields (all fields implemented)
- ✅ Navigation updated with all new routes
- ✅ Routing infrastructure complete
- ✅ Problem Spaces feature (full CRUD, list view, detail view with tabs, insight management)
- ✅ Advanced repository filtering (Project, Session, Participant Context, Date Range)
- ✅ Enhanced nugget cards (participant context badges, project info, add to problem space)
- ✅ Bulk actions in repository (select all, bulk add to problem space)
- ✅ Repository analytics dashboard (insights over time, category distribution, sentiment trends, etc.)

**Still Missing:**

- Dashboard
- Settings page
- Team collaboration features
- Breadcrumbs component
- Comments system for problem spaces
- Export functionality

## Phase 1: Foundation & Data Models

### 1.1 Firestore Data Models

- **Projects Collection**
- Fields: `name`, `description`, `startDate`, `endDate`, `status` (active/completed/archived), `userId`, `teamId`, `createdAt`, `updatedAt`, `researchGoals`, `teamMembers[]`
- Firestore functions: `createProject()`, `getProjects()`, `getProjectById()`, `updateProject()`, `deleteProject()`, `getProjectsByStatus()`
- File: `src/lib/firestoreUtils.js`

- **Problem Spaces Collection**
- Fields: `name`, `description`, `privacy` (private/team), `userId`, `teamId`, `contributors[]`, `outputType`, `problemStatement`, `keyQuestions[]`, `linkedProjects[]`, `insightIds[]`, `createdAt`, `updatedAt`
- Firestore functions: `createProblemSpace()`, `getProblemSpaces()`, `getProblemSpaceById()`, `updateProblemSpace()`, `addInsightToProblemSpace()`, `removeInsightFromProblemSpace()`, `updateProblemSpacePrivacy()`
- File: `src/lib/firestoreUtils.js`

- **Update Session Model**
- Add participant context fields: `participantContext` object with `companyName`, `companySize`, `userRole`, `industry`, `productTenure`, `userType`
- Update `saveSession()` to handle new fields
- File: `src/lib/firestoreUtils.js`

### 1.2 Routing Infrastructure

- Update `App.jsx` with new routes:
- `/dashboard` - Dashboard page
- `/projects` - Projects list
- `/projects/:id` - Individual project view
- `/sessions` - Sessions list
- `/sessions/:id` - Individual session view
- `/repository` - Repository (existing, enhance)
- `/problem-spaces` - Problem spaces list
- `/problem-spaces/:id` - Individual problem space view
- `/settings` - Settings page
- Create route components structure
- File: `src/App.jsx`

## Phase 2: Core Features - Projects

### 2.1 Projects List View

- Create `src/pages/ProjectsPage.jsx`
- Display all projects with filtering by status (Active/Completed/Archived)
- Project cards showing: name, description, session count, team members, date range
- Quick actions: View, Edit, Archive
- "Create New Project" button
- File: `src/pages/ProjectsPage.jsx`

### 2.2 Individual Project View

- Create `src/pages/ProjectDetailPage.jsx`
- Tab navigation: Overview, Sessions, Insights, Problem Spaces, Settings
- **Overview Tab:**
- Editable project details (name, description, dates, research goals)
- Team members management
- Quick stats (session count, insight count)
- **Sessions Tab:**
- List all sessions in project
- Filter by session type, sort by date/name
- "Create New Session" within project context
- **Insights Tab:**
- All nuggets from project sessions
- Search & filter (reuse RepositorySearchView components)
- Category breakdown, tag cloud, sentiment overview
- Bulk action: "Add to Problem Space"
- **Problem Spaces Tab:**
- List problem spaces using insights from this project
- Show insight contribution count per problem space
- "Create Problem Space from Project Insights" action
- **Settings Tab:**
- Edit project details
- Manage team access
- Archive/Complete project
- Export project data
- Files: `src/pages/ProjectDetailPage.jsx`, `src/components/ProjectTabs/`

### 2.3 Create/Edit Project Forms

- Create `src/components/ProjectForm.jsx`
- Form fields: name, description, start date, end date, research goals, team members
- Validation and error handling
- File: `src/components/ProjectForm.jsx`

### 2.4 Update Session Creation to Support Projects

- Add project selection dropdown to `SessionDetailsForm.jsx`
- Update `SimplifiedUpload.jsx` to handle project assignment
- Update `saveSession()` calls to include `projectId`
- Files: `src/components/SessionDetailsForm.jsx`, `src/components/SimplifiedUpload.jsx`

## Phase 3: Enhanced Sessions

### 3.1 Sessions List View

- Create `src/pages/SessionsPage.jsx`
- List all sessions with filters:
- By project
- By session type
- By date range
- By participant context (company size, role, industry)
- Search functionality
- Session cards with metadata preview
- File: `src/pages/SessionsPage.jsx`

### 3.2 Individual Session View

- Create `src/pages/SessionDetailPage.jsx`
- **Session Header:**
- Editable metadata (title, date, type, participant name, recording link, project)
- Participant context section (company name, size, role, industry, product tenure, user type)
- Session actions (Edit, Export, Delete)
- **Transcript Panel:**
- Full transcript with inline editing
- Edit mode toggle, auto-save indicator
- PII detection highlights (if enabled)
- Timestamp navigation
- Text selection → Create Nugget
- Search within transcript
- Transcript actions (Download, Replace, View History)
- **Insights Panel:**
- All nuggets for this session
- Filter/sort nuggets
- Create/Edit/Delete nuggets
- Bulk action: "Add to Problem Space"
- **Session Analytics:**
- Sentiment distribution
- Category breakdown
- Tag cloud
- Files: `src/pages/SessionDetailPage.jsx`, `src/components/SessionComponents/`

### 3.3 Enhanced Participant Context

- Update `SessionDetailsForm.jsx` to include participant context fields:
- Company Name
- Company Size (SMB / Mid-Market / Enterprise)
- User Role/Title
- Industry Vertical
- Product Tenure (New / Regular / Power User)
- User Type (Admin / End User / Decision Maker)
- Make fields optional but structured
- File: `src/components/SessionDetailsForm.jsx`

### 3.4 Transcript Editing

- Create `src/components/EditableTranscript.jsx`
- Inline editing with auto-save
- Version history tracking (store in Firestore `transcriptVersions` subcollection)
- Edit mode toggle
- File: `src/components/EditableTranscript.jsx`

## Phase 4: Problem Spaces ✅ COMPLETED

### 4.1 Problem Spaces List View ✅

- ✅ Created `src/pages/ProblemSpacesPage.jsx`
- ✅ Board/list view toggle implemented
- ✅ Filters: My Problem Spaces, Team Problem Spaces, Recently Updated
- ✅ Problem space cards with: name, description, privacy badge, contributor avatars, insight count, last updated, output type icon
- ✅ Quick actions: View, Share Settings, Duplicate
- File: `src/pages/ProblemSpacesPage.jsx`

### 4.2 Individual Problem Space View ✅

- ✅ Created `src/pages/ProblemSpaceDetailPage.jsx`
- ✅ **Header:**
- ✅ Editable name & description
- ✅ Privacy settings (Private/Team) with toggle
- ✅ Contributors display
- ✅ Output type selector
- ✅ Actions: Share, Export, Duplicate, Delete
- ✅ **Overview Tab:**
- ✅ Problem statement (textarea editor)
- ✅ Key questions/hypotheses (add/remove)
- ✅ Linked projects display
- ✅ Quick stats (insights, contributors, linked projects)
- ✅ **Insights Tab:**
- ✅ All nuggets in problem space via ProblemSpaceInsightManager
- ✅ Add insights (search/browse from Repository)
- ✅ Remove insights
- ✅ **Comments Tab:**
- ✅ Placeholder (ready for future implementation)
- ✅ **Settings Tab:**
- ✅ Privacy & Sharing
- ✅ Output Settings
- ✅ Contributors management
- Files: `src/pages/ProblemSpaceDetailPage.jsx`

### 4.3 Create Problem Space Form ✅

- ✅ Created `src/components/ProblemSpaceForm.jsx`
- ✅ Fields: name, description, privacy settings, output type, problem statement, key questions
- ✅ Validation and error handling
- ✅ Create and edit modes
- File: `src/components/ProblemSpaceForm.jsx`

### 4.4 Insight Management for Problem Spaces ✅

- ✅ Created `src/components/ProblemSpaceInsightManager.jsx`
- ✅ Add/remove insights from problem space
- ✅ Bulk operations (add multiple insights)
- ✅ Search and filter available insights
- ✅ Integration with RepositoryNuggetCard
- File: `src/components/ProblemSpaceInsightManager.jsx`

**Additional:** Added `deleteProblemSpace()` function to `src/lib/firestoreUtils.js`

## Phase 5: Enhanced Repository ✅ COMPLETED

### 5.1 Advanced Filtering ✅

- ✅ Created `src/components/AdvancedFilters.jsx`
- ✅ Updated `RepositorySearchView.jsx` with new filters:
- ✅ Filter by Project (dropdown of all projects)
- ✅ Filter by Session (dropdown of all sessions)
- ✅ Filter by Participant Context:
  - ✅ Company Size (SMB, Mid-Market, Enterprise)
  - ✅ User Type (Admin, End User, Decision Maker)
  - ✅ Product Tenure (New, Regular, Power User)
  - ✅ Industry (text input)
- ✅ Filter by Date Range (Last 7/30/90 days, Last year)
- ✅ Collapsible filter panel with active filter badges
- ✅ Clear all functionality
- Files: `src/components/AdvancedFilters.jsx`, `src/components/RepositorySearchView.jsx`

### 5.2 Enhanced Nugget Cards ✅

- ✅ Updated `RepositoryNuggetCard.jsx` to show:
- ✅ Participant context badge (e.g., "Enterprise Admin")
- ✅ Source project badge (if assigned)
- ✅ "Add to Problem Space" button (single insight)
- ✅ Improved layout with contextual badges
- File: `src/components/RepositoryNuggetCard.jsx`

### 5.3 Bulk Actions ✅

- ✅ Added bulk selection UI to Repository
- ✅ Checkbox on each nugget card
- ✅ "Select All" / "Deselect All" button
- ✅ Selected count badge
- ✅ "Add Selected to Problem Space" bulk action
- ✅ Selection state management
- File: `src/components/RepositorySearchView.jsx`

### 5.4 Analytics Dashboard (Repository) ✅

- ✅ Created `src/components/RepositoryAnalytics.jsx`
- ✅ Insights Over Time chart (last 6 months)
- ✅ Category Distribution (bar chart)
- ✅ Project Distribution (top 5 projects)
- ✅ Sentiment Trends (positive, pain points, features, other)
- ✅ Most Common Tags (top 10)
- ✅ Participant Segment Breakdown
- ✅ Toggle to show/hide analytics
- ✅ Visual charts using CSS bars
- File: `src/components/RepositoryAnalytics.jsx`

## Phase 6: Dashboard

### 6.1 Dashboard Page

- Create `src/pages/DashboardPage.jsx`
- **Quick Stats Overview:**
- Total Sessions (this week/month)
- Total Insights Created
- Active Projects
- Active Problem Spaces
- **Quick Actions:**
- New Session
- New Project
- New Problem Space
- **Recent Activity:**
- Recently Viewed Sessions
- Recently Updated Problem Spaces
- Recently Accessed Projects
- File: `src/pages/DashboardPage.jsx`

### 6.2 Dashboard Components

- Create `src/components/Dashboard/QuickStats.jsx`
- Create `src/components/Dashboard/QuickActions.jsx`
- Create `src/components/Dashboard/RecentActivity.jsx`
- Files: `src/components/Dashboard/`

## Phase 7: Settings

### 7.1 Settings Page Structure

- Create `src/pages/SettingsPage.jsx`
- Tab navigation: Profile, Team Management, Research Configuration, Privacy & Security, Integrations, Audit & Compliance, Billing
- File: `src/pages/SettingsPage.jsx`

### 7.2 Profile Settings

- Create `src/components/Settings/ProfileSettings.jsx`
- Personal information
- Email & notifications
- Password & security
- Display preferences
- File: `src/components/Settings/ProfileSettings.jsx`

### 7.3 Team Management (Admin)

- Create `src/components/Settings/TeamManagement.jsx`
- View all members
- Invite new members
- Edit roles (Admin, Researcher, Viewer)
- Deactivate members
- Pending invitations
- Team settings (name, logo, default permissions)
- File: `src/components/Settings/TeamManagement.jsx`

### 7.4 Research Configuration

- Create `src/components/Settings/ResearchConfiguration.jsx`
- Participant context fields: enable/disable, custom fields, required vs optional
- Custom dictionaries: industry terms, company-specific terms, product names, acronyms
- Categories management: default categories, custom categories
- Tags management: predefined tags, tag groups/hierarchies, tag colors, merge/archive
- File: `src/components/Settings/ResearchConfiguration.jsx`

### 7.5 Privacy & Security (Admin)

- Create `src/components/Settings/PrivacySecurity.jsx`
- PII Detection & Redaction: enable/disable, configure types, redaction method, audit log
- Data Retention Policies: transcript, nugget, session recording, audit log, problem space retention
- Data Residency: select region, migration options
- Access & Permissions: IP allowlisting, session timeout, 2FA, problem space sharing controls
- File: `src/components/Settings/PrivacySecurity.jsx`

### 7.6 Integrations

- Create `src/components/Settings/Integrations.jsx`
- Storage Providers: Google Drive, OneDrive/SharePoint
- MCP Integration (Q1 2026): connect AI tools, configure endpoints, data sharing permissions
- Other Integrations: Slack, Zapier/Webhooks, Calendar Sync, Notion/Confluence embeds
- File: `src/components/Settings/Integrations.jsx`

### 7.7 Audit & Compliance

- Create `src/components/Settings/AuditCompliance.jsx`
- Audit Logs: view all activity, filter by user/action type/resource type, export
- Compliance Reports: GDPR, HIPAA, data processing records
- Data Export: export all data (CSV/JSON), include options, schedule exports, export history
- File: `src/components/Settings/AuditCompliance.jsx`

### 7.8 Billing (Admin)

- Create `src/components/Settings/Billing.jsx`
- Current plan details, usage stats, user licenses
- Payment methods
- Billing history
- Upgrade/downgrade
- Cancel subscription
- File: `src/components/Settings/Billing.jsx`

## Phase 8: Navigation & UI Updates

### 8.1 Main Navigation ✅ (Partially Complete)

- ✅ Updated `NavigationHeader.jsx` with new navigation items:
- ✅ Dashboard
- ✅ Projects
- ✅ Sessions
- ✅ Repository
- ✅ Problem Spaces (added with Target icon)
- ⏳ Settings (route exists, page needs implementation)
- ✅ Updated active state logic
- ✅ Fixed navigation to prioritize React Router over callbacks
- ✅ Updated `RepositoryPage.jsx` to use React Router navigation
- Files: `src/components/NavigationHeader.jsx`, `src/pages/RepositoryPage.jsx`

### 8.2 Breadcrumbs

- Create `src/components/Breadcrumbs.jsx` for deep navigation
- Use in detail pages (Project, Session, Problem Space)
- File: `src/components/Breadcrumbs.jsx`

## Phase 9: Collaboration Features

### 9.1 Comments System

- Create `src/components/Comments/CommentsThread.jsx`
- Create `src/components/Comments/CommentForm.jsx`
- Firestore: `comments` collection with `problemSpaceId`, `insightId`, `userId`, `content`, `createdAt`, `resolved`
- @mention support
- File: `src/components/Comments/`

### 9.2 Sharing & Permissions

- Create `src/components/Sharing/ShareDialog.jsx`
- Generate read-only links for problem spaces
- Password protection
- Expiration dates
- Contributor permissions (Can Edit / Can View)
- File: `src/components/Sharing/`

### 9.3 Activity Feed

- Create `src/components/ActivityFeed.jsx`
- Track: insight additions, comments, problem space updates, project changes
- Firestore: `activities` collection or embedded in problem spaces
- File: `src/components/ActivityFeed.jsx`

## Phase 10: Export & Integration

### 10.1 Export Functionality

- Create `src/lib/exportUtils.js`
- PDF export for problem spaces
- PowerPoint export
- CSV export
- Embed code generation (Notion/Confluence)
- File: `src/lib/exportUtils.js`

### 10.2 Export UI Components

- Create `src/components/Export/ExportDialog.jsx`
- Format selection
- Options (include transcripts, include comments, etc.)
- File: `src/components/Export/`

## Implementation Notes

**Priority Order:**

1. Phase 1 (Foundation) - Critical for everything else
2. Phase 2 (Projects) - Core feature, builds on foundation
3. Phase 3 (Enhanced Sessions) - Improves existing functionality
4. ✅ Phase 4 (Problem Spaces) - **COMPLETED** - Major new feature
5. ✅ Phase 5 (Enhanced Repository) - **COMPLETED** - Improves existing functionality
6. Phase 6 (Dashboard) - Nice to have, can be built in parallel
7. Phase 7 (Settings) - Can be built incrementally
8. Phase 8 (Navigation) - Partially complete (main nav done, breadcrumbs pending)
9. Phase 9 (Collaboration) - Advanced feature
10. Phase 10 (Export) - Advanced feature

**Progress Summary:**
- ✅ Phase 4: Problem Spaces - Fully implemented (4.1-4.4)
- ✅ Phase 5: Enhanced Repository - Fully implemented (5.1-5.4)
- ✅ Phase 8.1: Main Navigation - Completed (Problem Spaces added, navigation fixed)
- ⏳ Remaining: Phases 1-3, 6-7, 8.2, 9-10

**Dependencies:**

- All phases depend on Phase 1 (data models)
- Problem Spaces (Phase 4) depends on Projects (Phase 2)
- Enhanced Repository (Phase 5) benefits from Projects and Problem Spaces
- Settings (Phase 7) can be built incrementally alongside other features

**Firestore Indexes Needed:**

- `projects`: `(userId, status, createdAt)`, `(teamId, status, createdAt)`
- `problemSpaces`: `(userId, privacy, updatedAt)`, `(teamId, privacy, updatedAt)`, `(contributors, updatedAt)`
- `sessions`: `(projectId, userId, createdAt)` (already noted in architecture)
- `sessions`: `(userId, session_date)` for date range filtering
- `sessions`: `(userId, participantContext.companySize)` for participant filtering

**UI Component Library:**

- Leverage existing shadcn/ui components
- May need to add: Rich text editor, Drag & drop, Date range picker, Multi-select