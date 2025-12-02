#!/usr/bin/env node

/**
 * Migration Script: Assign workspaceId to resources without it
 * 
 * This script:
 * 1. Finds all sessions, projects, and themes without workspaceId
 * 2. Assigns them to the user's default workspace or organization's default workspace
 * 3. Validates data integrity
 * 4. Reports on orphaned resources
 * 
 * Usage:
 *   node scripts/migrateWorkspaceIds.js [--dry-run] [--collection=COLLECTION]
 * 
 * Options:
 *   --dry-run: Preview changes without making them
 *   --collection=COLLECTION: Only migrate specific collection (sessions, projects, themes)
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const collectionArg = args.find(arg => arg.startsWith('--collection='));
const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;

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
  sessionsUpdated: 0,
  projectsUpdated: 0,
  themesUpdated: 0,
  sessionsSkipped: 0,
  projectsSkipped: 0,
  themesSkipped: 0,
  sessionsOrphaned: 0,
  projectsOrphaned: 0,
  themesOrphaned: 0,
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

// Get user's default workspace
async function getUserDefaultWorkspace(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    // Check if user has workspaceIds
    if (userData.workspaceIds && userData.workspaceIds.length > 0) {
      return userData.workspaceIds[0];
    }

    // If user has organizationId, get default workspace from organization
    if (userData.organizationId) {
      const workspacesSnapshot = await db.collection('workspaces')
        .where('organizationId', '==', userData.organizationId)
        .orderBy('createdAt', 'asc')
        .limit(1)
        .get();

      if (!workspacesSnapshot.empty) {
        return workspacesSnapshot.docs[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting workspace for user ${userId}:`, error.message);
    return null;
  }
}

// Update resource with workspaceId
async function updateResource(collection, resourceId, workspaceId, userId, isDryRun) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would update ${collection}/${resourceId} with workspaceId: ${workspaceId}`);
    return { success: true };
  }

  try {
    const resourceRef = db.collection(collection).doc(resourceId);
    const now = admin.firestore.Timestamp.now();

    await resourceRef.update({
      workspaceId: workspaceId,
      updatedAt: now
    });

    if (collection === 'sessions') stats.sessionsUpdated++;
    else if (collection === 'projects') stats.projectsUpdated++;
    else if (collection === 'themes') stats.themesUpdated++;

    return { success: true };
  } catch (error) {
    console.error(`✗ Error updating ${collection}/${resourceId}:`, error.message);
    stats.errors.push({ type: collection, resourceId, userId, error: error.message });
    return { success: false, error: error.message };
  }
}

// Migrate resources in a collection
async function migrateCollection(collectionName, isDryRun) {
  console.log(`\n=== Migrating ${collectionName} ===\n`);

  try {
    // Get all resources in the collection
    const resourcesSnapshot = await db.collection(collectionName).get();
    const resourcesWithoutWorkspace = [];
    const resourcesWithWorkspace = [];

    resourcesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.workspaceId) {
        resourcesWithoutWorkspace.push({ id: doc.id, ...data });
      } else {
        resourcesWithWorkspace.push({ id: doc.id });
      }
    });

    console.log(`Total ${collectionName}: ${resourcesSnapshot.size}`);
    console.log(`With workspaceId: ${resourcesWithWorkspace.length}`);
    console.log(`Without workspaceId: ${resourcesWithoutWorkspace.length}\n`);

    if (resourcesWithoutWorkspace.length === 0) {
      console.log(`✓ All ${collectionName} already have workspaceId\n`);
      return;
    }

    // Process each resource
    let processed = 0;
    let skipped = 0;
    let orphaned = 0;

    for (const resource of resourcesWithoutWorkspace) {
      const userId = resource.userId || resource.createdBy;
      
      if (!userId) {
        console.log(`⚠️  ${collectionName}/${resource.id}: No userId found - skipping`);
        orphaned++;
        if (collectionName === 'sessions') stats.sessionsOrphaned++;
        else if (collectionName === 'projects') stats.projectsOrphaned++;
        else if (collectionName === 'themes') stats.themesOrphaned++;
        continue;
      }

      // Get user's default workspace
      const workspaceId = await getUserDefaultWorkspace(userId);

      if (!workspaceId) {
        console.log(`⚠️  ${collectionName}/${resource.id}: User ${userId} has no workspace - skipping`);
        skipped++;
        if (collectionName === 'sessions') stats.sessionsSkipped++;
        else if (collectionName === 'projects') stats.projectsSkipped++;
        else if (collectionName === 'themes') stats.themesSkipped++;
        continue;
      }

      // Update resource
      const result = await updateResource(collectionName, resource.id, workspaceId, userId, isDryRun);
      
      if (result.success) {
        processed++;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${resourcesWithoutWorkspace.length}...`);
        }
      }
    }

    console.log(`\n✓ ${collectionName} migration complete:`);
    console.log(`  Updated: ${processed}`);
    console.log(`  Skipped (no workspace): ${skipped}`);
    console.log(`  Orphaned (no userId): ${orphaned}`);
  } catch (error) {
    console.error(`✗ Error migrating ${collectionName}:`, error.message);
    stats.errors.push({ type: collectionName, error: error.message });
  }
}

// Validate data integrity
async function validateDataIntegrity() {
  console.log('\n=== Validating Data Integrity ===\n');

  const issues = [];

  try {
    // Check for users without organizationId
    const usersSnapshot = await db.collection('users').get();
    let usersWithoutOrg = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.organizationId) {
        usersWithoutOrg++;
      }
    });

    if (usersWithoutOrg > 0) {
      issues.push({
        type: 'users_without_organization',
        count: usersWithoutOrg,
        message: `${usersWithoutOrg} users do not have an organizationId`
      });
    }

    // Check for resources with invalid workspaceId
    const collections = ['sessions', 'projects', 'themes'];
    for (const collectionName of collections) {
      const resourcesSnapshot = await db.collection(collectionName).get();
      let invalidWorkspaces = 0;

      for (const doc of resourcesSnapshot.docs) {
        const data = doc.data();
        if (data.workspaceId) {
          // Verify workspace exists
          const workspaceDoc = await db.collection('workspaces').doc(data.workspaceId).get();
          if (!workspaceDoc.exists) {
            invalidWorkspaces++;
          }
        }
      }

      if (invalidWorkspaces > 0) {
        issues.push({
          type: `${collectionName}_invalid_workspace`,
          count: invalidWorkspaces,
          message: `${invalidWorkspaces} ${collectionName} reference non-existent workspaces`
        });
      }
    }

    // Check for workspaces without organizationId
    const workspacesSnapshot = await db.collection('workspaces').get();
    let workspacesWithoutOrg = 0;
    workspacesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.organizationId) {
        workspacesWithoutOrg++;
      }
    });

    if (workspacesWithoutOrg > 0) {
      issues.push({
        type: 'workspaces_without_organization',
        count: workspacesWithoutOrg,
        message: `${workspacesWithoutOrg} workspaces do not have an organizationId`
      });
    }

    // Report issues
    if (issues.length === 0) {
      console.log('✓ No data integrity issues found\n');
    } else {
      console.log('⚠️  Data integrity issues found:\n');
      issues.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
      console.log();
    }

    return issues;
  } catch (error) {
    console.error('✗ Error validating data integrity:', error.message);
    return [];
  }
}

// Print summary
function printSummary() {
  console.log('\n=== Migration Summary ===\n');
  console.log('Resources Updated:');
  console.log(`  Sessions: ${stats.sessionsUpdated}`);
  console.log(`  Projects: ${stats.projectsUpdated}`);
  console.log(`  Themes: ${stats.themesUpdated}`);
  console.log('\nResources Skipped (no workspace available):');
  console.log(`  Sessions: ${stats.sessionsSkipped}`);
  console.log(`  Projects: ${stats.projectsSkipped}`);
  console.log(`  Themes: ${stats.themesSkipped}`);
  console.log('\nOrphaned Resources (no userId):');
  console.log(`  Sessions: ${stats.sessionsOrphaned}`);
  console.log(`  Projects: ${stats.projectsOrphaned}`);
  console.log(`  Themes: ${stats.themesOrphaned}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.slice(0, 10).forEach(error => {
      console.log(`  - ${error.type}/${error.resourceId || 'unknown'}: ${error.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more errors`);
    }
  }
}

// Main migration function
async function migrate() {
  console.log('\n=== Migration Script: Assign workspaceId to Resources ===\n');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Determine which collections to migrate
    const collections = targetCollection 
      ? [targetCollection]
      : ['sessions', 'projects', 'themes'];

    // Validate collections
    const validCollections = ['sessions', 'projects', 'themes'];
    for (const collection of collections) {
      if (!validCollections.includes(collection)) {
        console.error(`✗ Invalid collection: ${collection}`);
        console.error(`  Valid collections: ${validCollections.join(', ')}`);
        process.exit(1);
      }
    }

    // Confirm before proceeding (unless dry-run)
    if (!isDryRun) {
      console.log(`This will update resources in: ${collections.join(', ')}\n`);
      const confirmed = await promptConfirmation('Do you want to continue? (y/n): ');
      if (!confirmed) {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Migrate each collection
    for (const collection of collections) {
      await migrateCollection(collection, isDryRun);
    }

    // Validate data integrity
    await validateDataIntegrity();

    // Print summary
    printSummary();

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

