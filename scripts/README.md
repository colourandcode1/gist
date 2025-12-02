# Migration Scripts

## migrateToOrganizations.js

Migrates existing users and data to the new organization/workspace structure.

### Prerequisites

- Firebase Admin SDK credentials (service account key file)
- Node.js installed
- `firebase-admin` package installed (`npm install`)

### Quick Start

Use the helper script:

```bash
# Preview changes (recommended first)
./scripts/run-migration.sh --dry-run

# Run actual migration
./scripts/run-migration.sh
```

### Manual Usage

Set environment variables and run directly:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
export FIREBASE_PROJECT_ID="gist-aa4c1"

# Dry run (preview changes)
node scripts/migrateToOrganizations.js --dry-run

# Actual migration
node scripts/migrateToOrganizations.js
```

### Options

- `--dry-run`: Preview changes without making them (safe to run)
- `--single-org`: Create a single organization for all users (default: groups by email domain)

### What It Does

1. **Groups users** by email domain (or creates single organization)
2. **Creates organizations** with Starter tier and 14-day trial
3. **Creates default workspaces** for each organization
4. **Updates users** with organizationId, workspaceIds, role, and seatType
5. **Updates resources** (sessions, projects, problemSpaces) with workspaceId
6. **Creates subscriptions** for each organization

### Safety Features

- ✅ Idempotent - safe to run multiple times (skips already migrated data)
- ✅ Dry-run mode for previewing changes
- ✅ Confirmation prompt before making changes
- ✅ Comprehensive error handling and logging
- ✅ Detailed summary of all operations

### Service Account Key

The service account key file (`gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json`) is:
- ✅ Stored in `scripts/` directory
- ✅ Protected by `.gitignore` (never committed to git)
- ✅ Required for Firebase Admin SDK access

**Never commit service account keys to version control!**

---

## migrateWorkspaceIds.js

Assigns workspaceId to resources (sessions, projects, themes) that are missing it.

### Prerequisites

Same as `migrateToOrganizations.js` - requires Firebase Admin SDK credentials.

### Quick Start

```bash
# Preview changes (recommended first)
node scripts/migrateWorkspaceIds.js --dry-run

# Run actual migration
node scripts/migrateWorkspaceIds.js
```

### Options

- `--dry-run`: Preview changes without making them (safe to run)
- `--collection=COLLECTION`: Only migrate specific collection (`sessions`, `projects`, or `themes`)

### Examples

```bash
# Migrate only sessions
node scripts/migrateWorkspaceIds.js --collection=sessions

# Dry run for all collections
node scripts/migrateWorkspaceIds.js --dry-run

# Migrate all collections
node scripts/migrateWorkspaceIds.js
```

### What It Does

1. **Finds resources** without workspaceId in sessions, projects, and themes collections
2. **Assigns workspaceId** from the resource owner's default workspace or organization's default workspace
3. **Validates data integrity** by checking:
   - Users without organizationId
   - Resources with invalid workspaceId references
   - Workspaces without organizationId
4. **Reports statistics** on updated, skipped, and orphaned resources

### Safety Features

- ✅ Idempotent - safe to run multiple times (only updates resources without workspaceId)
- ✅ Dry-run mode for previewing changes
- ✅ Confirmation prompt before making changes
- ✅ Comprehensive error handling and logging
- ✅ Detailed summary of all operations
- ✅ Data integrity validation

### Resource Assignment Logic

1. If resource has `userId` or `createdBy`, gets that user's default workspace
2. If user has `workspaceIds` array, uses the first workspace
3. If user has `organizationId` but no `workspaceIds`, gets organization's first workspace
4. If no workspace can be found, resource is skipped (reported in summary)

---

## testSecurity.js

Security testing script that verifies cross-organization data access prevention and Firestore rules.

### Quick Start

```bash
# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
export FIREBASE_PROJECT_ID="gist-aa4c1"

# Run security tests
node scripts/testSecurity.js
```

### What It Tests

1. **Organization Structure** - Verifies organizations have required fields
2. **Workspace-Organization Mapping** - Ensures workspaces belong to correct organizations
3. **Resource-Workspace Mapping** - Verifies sessions, projects, themes have workspaceId
4. **Cross-Organization Isolation** - Checks for data leakage between organizations
5. **Organization Requests** - Validates join request structure
6. **User Organization Membership** - Verifies users are properly linked to organizations
7. **Workspace Immutability** - Checks that critical workspace fields are present

### Output

The script provides:
- ✅ Pass/fail status for each test
- ⚠️ Warnings for potential issues
- 📊 Summary of all test results
- Exit code 1 if any tests fail

---

## testIntegration.js

Integration testing script that verifies signup flows, organization join/approval, and data isolation.

### Quick Start

```bash
# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
export FIREBASE_PROJECT_ID="gist-aa4c1"

# Run integration tests
node scripts/testIntegration.js
```

### What It Tests

1. **Signup Creates Organization** - Verifies new signups create organizations and workspaces
2. **Organization Join Request** - Validates join request flow
3. **Approved Request Adds User** - Ensures approved requests properly add users
4. **Rejected Request Does Not Add User** - Verifies rejected requests don't add users
5. **Data Isolation** - Tests complete data isolation between organizations
6. **Audit Log Isolation** - Verifies audit logs are organization-scoped

### Output

The script provides:
- ✅ Pass/fail status for each test
- ⚠️ Warnings for potential issues
- 📊 Summary of all test results
- Exit code 1 if any tests fail

---

## TESTING_GUIDE.md

Comprehensive manual testing guide for Phase 6: Testing and Security Audit.

### Contents

- **Automated Testing Scripts** - How to run testSecurity.js and testIntegration.js
- **Manual Testing Checklist** - Step-by-step procedures for:
  - Cross-organization data access prevention
  - Firestore rules verification
  - Organization join/approval flow
  - Audit logs organization scoping
  - Signup with new organization creation
  - Signup with organization join request
  - Admin approval/rejection flow
  - Data isolation between organizations
- **Firestore Rules Testing** - Using Firebase Console Rules Playground
- **Browser Console Testing** - Manual security verification
- **Performance Testing** - Query performance with organization filtering
- **Reporting Issues** - How to document and fix test failures
- **Success Criteria** - What constitutes a passing test suite

