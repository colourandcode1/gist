#!/bin/bash

# Migration Script Runner
# This script sets up the environment variables and runs the migration

# Set the path to your service account key file
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"

# Set your Firebase project ID
export FIREBASE_PROJECT_ID="gist-aa4c1"

# Check if dry-run flag is passed
if [[ "$1" == "--dry-run" ]]; then
    echo "Running migration in DRY-RUN mode (no changes will be made)..."
    node scripts/migrateToOrganizations.js --dry-run
elif [[ "$1" == "--single-org" ]]; then
    echo "Running migration with single organization for all users..."
    node scripts/migrateToOrganizations.js --single-org
elif [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: ./scripts/run-migration.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run    Preview changes without making them (recommended first)"
    echo "  --single-org Create a single organization for all users"
    echo "  --help       Show this help message"
    echo ""
    echo "Example:"
    echo "  ./scripts/run-migration.sh --dry-run"
else
    echo "⚠️  WARNING: This will modify your Firestore database!"
    echo "Run with --dry-run first to preview changes."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" == "yes" ]]; then
        node scripts/migrateToOrganizations.js "$@"
    else
        echo "Migration cancelled."
    fi
fi

