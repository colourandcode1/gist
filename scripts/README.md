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

