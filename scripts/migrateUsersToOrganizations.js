#!/usr/bin/env node

/**
 * Migration Script: Create organizations for users who don't have one
 * 
 * This script:
 * 1. Finds all users without an organizationId or without an organization by owner
 * 2. Creates an organization for each user with default name
 * 3. Creates a default workspace for each organization
 * 4. Updates user profile with organizationId and workspaceIds
 * 5. Sets user as admin (is_admin: true) for their own organization
 * 
 * Usage:
 *   node scripts/migrateUsersToOrganizations.js [--dry-run]
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
  usersProcessed: 0,
  organizationsCreated: 0,
  workspacesCreated: 0,
  usersUpdated: 0,
  errors: []
};

// Helper function to get email domain
function getEmailDomain(email) {
  if (!email || !email.includes('@')) return 'default';
  return email.split('@')[1].toLowerCase();
}

// Helper function to calculate trial end date (14 days from now)
function getTrialEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return admin.firestore.Timestamp.fromDate(date);
}

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

// Create organization
async function createOrganization(organizationData, isDryRun) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would create organization: ${organizationData.name}`);
    return { success: true, id: 'dry-run-org-id' };
  }

  try {
    const trialEndsAt = getTrialEndDate();
    const now = admin.firestore.Timestamp.now();

    const organizationPayload = {
      name: organizationData.name,
      tier: 'small_team',
      subscriptionId: null,
      subscriptionStatus: 'trialing',
      trialEndsAt: trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      workspaceLimit: 1,
      ownerId: organizationData.ownerId,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('organizations').add(organizationPayload);
    stats.organizationsCreated++;
    console.log(`✓ Created organization: ${organizationData.name} (${docRef.id})`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`✗ Error creating organization ${organizationData.name}:`, error.message);
    stats.errors.push({ type: 'organization', error: error.message });
    return { success: false, error: error.message };
  }
}

// Create default workspace
async function createWorkspace(workspaceData, isDryRun) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would create workspace: ${workspaceData.name}`);
    return { success: true, id: 'dry-run-workspace-id' };
  }

  try {
    const now = admin.firestore.Timestamp.now();

    const workspacePayload = {
      name: workspaceData.name,
      description: workspaceData.description || '',
      organizationId: workspaceData.organizationId,
      createdBy: workspaceData.createdBy,
      permissions: null,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('workspaces').add(workspacePayload);
    stats.workspacesCreated++;
    console.log(`✓ Created workspace: ${workspaceData.name} (${docRef.id})`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`✗ Error creating workspace ${workspaceData.name}:`, error.message);
    stats.errors.push({ type: 'workspace', error: error.message });
    return { success: false, error: error.message };
  }
}

// Check if user has an organization
async function userHasOrganization(userId, userEmail) {
  try {
    // Check if user has organizationId in profile
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.organizationId) {
        // Verify organization exists
        const orgDoc = await db.collection('organizations').doc(userData.organizationId).get();
        if (orgDoc.exists()) {
          return true;
        }
      }
    }

    // Check if user owns an organization
    const orgQuery = await db.collection('organizations')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    if (!orgQuery.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking organization for user ${userId}:`, error.message);
    return false;
  }
}

// Process a single user
async function processUser(userDoc, isDryRun) {
  const userId = userDoc.id;
  const userData = userDoc.data();
  const userEmail = userData.email || '';

  stats.usersProcessed++;

  // Check if user already has an organization
  const hasOrg = await userHasOrganization(userId, userEmail);
  if (hasOrg) {
    console.log(`⊘ Skipping user ${userEmail} - already has organization`);
    return;
  }

  console.log(`\n--- Processing user: ${userEmail} (${userId}) ---`);

  // Generate organization name from email domain or use default
  let orgName = 'My Organization';
  if (userEmail && userEmail.includes('@')) {
    const domain = getEmailDomain(userEmail);
    orgName = `${domain.charAt(0).toUpperCase() + domain.slice(1)} Organization`;
  }

  // Create organization
  const orgResult = await createOrganization({
    name: orgName,
    ownerId: userId
  }, isDryRun);

  if (!orgResult.success) {
    console.error(`Failed to create organization for ${userEmail}, skipping...`);
    return;
  }

  // Create default workspace
  const workspaceResult = await createWorkspace({
    name: 'Default Workspace',
    description: 'Default workspace for your organization',
    organizationId: orgResult.id,
    createdBy: userId
  }, isDryRun);

  if (!workspaceResult.success) {
    console.error(`Failed to create workspace for ${userEmail}, but organization was created`);
    // Continue anyway - user can create workspace later
  }

  // Update user profile
  if (!isDryRun) {
    try {
      const updateData = {
        organizationId: orgResult.id,
        is_admin: true, // User is admin of their own organization
        updatedAt: FieldValue.serverTimestamp()
      };

      if (workspaceResult.success) {
        updateData.workspaceIds = [workspaceResult.id];
      }

      await db.collection('users').doc(userId).update(updateData);
      stats.usersUpdated++;
      console.log(`✓ Updated user profile for ${userEmail}`);
    } catch (error) {
      console.error(`✗ Error updating user profile for ${userEmail}:`, error.message);
      stats.errors.push({ type: 'user_update', userId, error: error.message });
    }
  } else {
    console.log(`[DRY RUN] Would update user profile for ${userEmail}`);
    stats.usersUpdated++;
  }
}

// Main migration function
async function migrate() {
  console.log('\n=== Migration Script: Create Organizations for Users ===\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Get all users
    console.log('Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs;

    console.log(`Found ${users.size} users\n`);

    if (users.size === 0) {
      console.log('No users found. Exiting.');
      return;
    }

    // Confirm before proceeding (unless dry-run)
    if (!isDryRun) {
      const confirmed = await promptConfirmation(
        `This will create organizations for users without one. Continue? (y/n): `
      );
      if (!confirmed) {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Process each user
    for (const userDoc of users) {
      await processUser(userDoc, isDryRun);
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Users processed: ${stats.usersProcessed}`);
    console.log(`Organizations created: ${stats.organizationsCreated}`);
    console.log(`Workspaces created: ${stats.workspacesCreated}`);
    console.log(`Users updated: ${stats.usersUpdated}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.type}: ${err.error}`);
        if (err.userId) {
          console.log(`   User ID: ${err.userId}`);
        }
      });
    }

    console.log('\n✓ Migration completed!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
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

