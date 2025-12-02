#!/usr/bin/env node

/**
 * Migration Script: Add ownerId to existing workspaces
 * 
 * This script:
 * 1. Finds all workspaces without ownerId
 * 2. Sets ownerId to createdBy (preserving original creator as owner)
 * 3. Ensures all workspaces have ownerId for ownership transfer functionality
 * 
 * Usage:
 *   node scripts/migrateWorkspaceOwnership.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Preview changes without making them
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    const initOptions = {
      credential: admin.credential.applicationDefault()
    };
    
    if (projectId) {
      initOptions.projectId = projectId;
    }
    
    admin.initializeApp(initOptions);
    
    if (projectId) {
      console.log(`Using Firebase project: ${projectId}\n`);
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    console.error('\nPlease ensure you have:');
    console.error('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account key, or');
    console.error('2. Run: gcloud auth application-default login');
    if (!projectId) {
      console.error('3. Set FIREBASE_PROJECT_ID environment variable with your Firebase project ID');
    }
    process.exit(1);
  }
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Statistics tracking
const stats = {
  workspacesUpdated: 0,
  workspacesSkipped: 0,
  errors: []
};

// Helper function to prompt for confirmation
function promptConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main migration function
async function migrate() {
  console.log('\n=== Migration Script: Add ownerId to Workspaces ===\n');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Get all workspaces
    const workspacesSnapshot = await db.collection('workspaces').get();
    const workspacesWithoutOwnerId = [];
    const workspacesWithOwnerId = [];

    workspacesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.ownerId) {
        workspacesWithoutOwnerId.push({ id: doc.id, ...data });
      } else {
        workspacesWithOwnerId.push({ id: doc.id });
      }
    });

    console.log(`Total workspaces: ${workspacesSnapshot.size}`);
    console.log(`With ownerId: ${workspacesWithOwnerId.length}`);
    console.log(`Without ownerId: ${workspacesWithoutOwnerId.length}\n`);

    if (workspacesWithoutOwnerId.length === 0) {
      console.log('✓ All workspaces already have ownerId\n');
      return;
    }

    // Confirm before proceeding (unless dry-run)
    if (!isDryRun) {
      console.log(`This will update ${workspacesWithoutOwnerId.length} workspaces.\n`);
      const confirmed = await promptConfirmation('Do you want to continue? (y/n): ');
      if (!confirmed) {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Process each workspace
    let processed = 0;
    let skipped = 0;

    for (const workspace of workspacesWithoutOwnerId) {
      // Set ownerId to createdBy (preserve original creator as owner)
      const ownerId = workspace.createdBy;
      
      if (!ownerId) {
        console.log(`⚠️  Workspace ${workspace.id}: No createdBy found - skipping`);
        skipped++;
        stats.workspacesSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Would set ownerId=${ownerId} for workspace ${workspace.id}`);
        processed++;
      } else {
        try {
          const workspaceRef = db.collection('workspaces').doc(workspace.id);
          const now = admin.firestore.Timestamp.now();

          await workspaceRef.update({
            ownerId: ownerId,
            updatedAt: now
          });

          stats.workspacesUpdated++;
          processed++;
          
          if (processed % 10 === 0) {
            console.log(`  Processed ${processed}/${workspacesWithoutOwnerId.length}...`);
          }
        } catch (error) {
          console.error(`✗ Error updating workspace ${workspace.id}:`, error.message);
          stats.errors.push({ workspaceId: workspace.id, error: error.message });
        }
      }
    }

    console.log(`\n✓ Migration complete:`);
    console.log(`  Updated: ${processed}`);
    console.log(`  Skipped: ${skipped}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 10).forEach(error => {
        console.log(`  - Workspace ${error.workspaceId}: ${error.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }

    if (isDryRun) {
      console.log('\n⚠️  This was a dry run. No changes were made.');
      console.log('Run without --dry-run to apply changes.\n');
    } else {
      console.log('\n✓ Migration complete!\n');
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

