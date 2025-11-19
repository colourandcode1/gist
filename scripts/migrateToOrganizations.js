#!/usr/bin/env node

/**
 * Migration Script: Migrate existing users and data to organization/workspace structure
 * 
 * This script:
 * 1. Groups users by email domain (or creates single default organization)
 * 2. Creates organizations with Starter tier and 14-day trial
 * 3. Creates default workspaces for each organization
 * 4. Updates users with organizationId, workspaceIds, role, and seatType
 * 5. Updates sessions, projects, and problemSpaces with workspaceId
 * 6. Creates subscription documents for each organization
 * 
 * Usage:
 *   node scripts/migrateToOrganizations.js [--dry-run] [--single-org]
 * 
 * Options:
 *   --dry-run: Preview changes without making them
 *   --single-org: Create a single organization for all users (default: group by email domain)
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const useSingleOrg = args.includes('--single-org');

// Initialize Firebase Admin SDK
// Note: This requires a service account key file or environment variables
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable or use applicationDefault()
// Project ID can be set via FIREBASE_PROJECT_ID environment variable
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    const initOptions = {
      credential: admin.credential.applicationDefault()
    };
    
    // If project ID is provided, use it explicitly
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
  organizationsCreated: 0,
  workspacesCreated: 0,
  usersUpdated: 0,
  sessionsUpdated: 0,
  projectsUpdated: 0,
  problemSpacesUpdated: 0,
  subscriptionsCreated: 0,
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
      tier: 'starter',
      subscriptionId: null,
      subscriptionStatus: 'trialing',
      trialEndsAt: trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      researcherSeatsIncluded: 1,
      researcherSeatsUsed: 0,
      contributorSeatsUsed: 0,
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

// Create subscription
async function createSubscription(subscriptionData, isDryRun) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would create subscription for organization: ${subscriptionData.organizationId}`);
    return { success: true, id: 'dry-run-subscription-id' };
  }

  try {
    const trialEndsAt = getTrialEndDate();
    const now = admin.firestore.Timestamp.now();

    const subscriptionPayload = {
      organizationId: subscriptionData.organizationId,
      tier: 'starter',
      status: 'trialing',
      paymentProvider: null,
      paymentProviderSubscriptionId: null,
      paymentProviderCustomerId: null,
      currentPeriodStart: now,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: trialEndsAt,
      seats: 1,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection('subscriptions').add(subscriptionPayload);
    stats.subscriptionsCreated++;
    console.log(`✓ Created subscription for organization: ${subscriptionData.organizationId} (${docRef.id})`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`✗ Error creating subscription:`, error.message);
    stats.errors.push({ type: 'subscription', error: error.message });
    return { success: false, error: error.message };
  }
}

// Update user with organization and workspace
async function updateUser(userId, userData, isDryRun) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would update user: ${userId}`);
    return { success: true };
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const now = admin.firestore.Timestamp.now();

    const updates = {
      organizationId: userData.organizationId,
      workspaceIds: userData.workspaceIds || [],
      role: userData.role || 'researcher',
      seatType: userData.seatType || 'researcher',
      updatedAt: now
    };

    await userRef.update(updates);
    stats.usersUpdated++;
    return { success: true };
  } catch (error) {
    console.error(`✗ Error updating user ${userId}:`, error.message);
    stats.errors.push({ type: 'user', userId, error: error.message });
    return { success: false, error: error.message };
  }
}

// Update resource with workspaceId
async function updateResource(collection, resourceId, workspaceId, isDryRun) {
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
    else if (collection === 'problemSpaces') stats.problemSpacesUpdated++;

    return { success: true };
  } catch (error) {
    console.error(`✗ Error updating ${collection}/${resourceId}:`, error.message);
    stats.errors.push({ type: collection, resourceId, error: error.message });
    return { success: false, error: error.message };
  }
}

// Main migration function
async function migrate() {
  console.log('\n=== Migration Script: Organizations & Workspaces ===\n');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Step 1: Fetch all users
    console.log('Step 1: Fetching all users...');
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      // Skip users that already have an organizationId (already migrated)
      if (!data.organizationId) {
        users.push({ id: doc.id, ...data });
      }
    });

    console.log(`Found ${users.length} users to migrate\n`);

    if (users.length === 0) {
      console.log('No users to migrate. All users already have organizations.');
      return;
    }

    // Step 2: Group users by domain or create single organization
    console.log('Step 2: Grouping users...');
    const userGroups = {};

    if (useSingleOrg) {
      userGroups['default'] = users;
      console.log(`Creating single organization for all ${users.length} users\n`);
    } else {
      users.forEach(user => {
        const domain = getEmailDomain(user.email);
        if (!userGroups[domain]) {
          userGroups[domain] = [];
        }
        userGroups[domain].push(user);
      });
      console.log(`Grouped users into ${Object.keys(userGroups).length} organizations by email domain\n`);
    }

    // Step 3: Process each group
    for (const [domain, groupUsers] of Object.entries(userGroups)) {
      console.log(`\n--- Processing ${domain} (${groupUsers.length} users) ---`);

      // Get first user as owner
      const owner = groupUsers[0];
      const organizationName = useSingleOrg 
        ? 'Default Organization' 
        : `${domain.charAt(0).toUpperCase() + domain.slice(1)} Organization`;

      // Check if organization already exists for this owner
      const existingOrgQuery = await db.collection('organizations')
        .where('ownerId', '==', owner.id)
        .limit(1)
        .get();

      let organizationId;
      if (!existingOrgQuery.empty) {
        organizationId = existingOrgQuery.docs[0].id;
        console.log(`Organization already exists: ${organizationId}`);
      } else {
        // Create organization
        const orgResult = await createOrganization({
          name: organizationName,
          ownerId: owner.id
        }, isDryRun);

        if (!orgResult.success) {
          console.error(`Failed to create organization for ${domain}, skipping...`);
          continue;
        }
        organizationId = orgResult.id;
      }

      // Create default workspace
      const existingWorkspaceQuery = await db.collection('workspaces')
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();

      let workspaceId;
      if (!existingWorkspaceQuery.empty) {
        workspaceId = existingWorkspaceQuery.docs[0].id;
        console.log(`Workspace already exists: ${workspaceId}`);
      } else {
        const workspaceResult = await createWorkspace({
          name: 'Default Workspace',
          description: 'Default workspace created during migration',
          organizationId: organizationId,
          createdBy: owner.id
        }, isDryRun);

        if (!workspaceResult.success) {
          console.error(`Failed to create workspace for ${domain}, skipping...`);
          continue;
        }
        workspaceId = workspaceResult.id;
      }

      // Create subscription if it doesn't exist
      const existingSubQuery = await db.collection('subscriptions')
        .where('organizationId', '==', organizationId)
        .limit(1)
        .get();

      if (existingSubQuery.empty) {
        await createSubscription({
          organizationId: organizationId
        }, isDryRun);
      } else {
        console.log(`Subscription already exists for organization: ${organizationId}`);
      }

      // Update users
      console.log(`Updating ${groupUsers.length} users...`);
      for (const user of groupUsers) {
        const isOwner = user.id === owner.id;
        await updateUser(user.id, {
          organizationId: organizationId,
          workspaceIds: [workspaceId],
          role: isOwner ? 'admin' : 'researcher',
          seatType: 'researcher'
        }, isDryRun);
      }

      // Update resources (sessions, projects, problemSpaces)
      console.log(`Updating resources for ${groupUsers.length} users...`);
      const userIds = groupUsers.map(u => u.id);

      // Update sessions
      const sessionsQuery = await db.collection('sessions')
        .where('userId', 'in', userIds.length > 10 ? userIds.slice(0, 10) : userIds)
        .get();

      for (const sessionDoc of sessionsQuery.docs) {
        const data = sessionDoc.data();
        if (!data.workspaceId) {
          await updateResource('sessions', sessionDoc.id, workspaceId, isDryRun);
        }
      }

      // Handle more than 10 users (Firestore 'in' query limit)
      if (userIds.length > 10) {
        for (let i = 10; i < userIds.length; i += 10) {
          const batch = userIds.slice(i, i + 10);
          const batchSessionsQuery = await db.collection('sessions')
            .where('userId', 'in', batch)
            .get();
          
          for (const sessionDoc of batchSessionsQuery.docs) {
            const data = sessionDoc.data();
            if (!data.workspaceId) {
              await updateResource('sessions', sessionDoc.id, workspaceId, isDryRun);
            }
          }
        }
      }

      // Update projects
      const projectsQuery = await db.collection('projects')
        .where('userId', 'in', userIds.length > 10 ? userIds.slice(0, 10) : userIds)
        .get();

      for (const projectDoc of projectsQuery.docs) {
        const data = projectDoc.data();
        if (!data.workspaceId) {
          await updateResource('projects', projectDoc.id, workspaceId, isDryRun);
        }
      }

      if (userIds.length > 10) {
        for (let i = 10; i < userIds.length; i += 10) {
          const batch = userIds.slice(i, i + 10);
          const batchProjectsQuery = await db.collection('projects')
            .where('userId', 'in', batch)
            .get();
          
          for (const projectDoc of batchProjectsQuery.docs) {
            const data = projectDoc.data();
            if (!data.workspaceId) {
              await updateResource('projects', projectDoc.id, workspaceId, isDryRun);
            }
          }
        }
      }

      // Update problemSpaces
      const problemSpacesQuery = await db.collection('problemSpaces')
        .where('userId', 'in', userIds.length > 10 ? userIds.slice(0, 10) : userIds)
        .get();

      for (const problemSpaceDoc of problemSpacesQuery.docs) {
        const data = problemSpaceDoc.data();
        if (!data.workspaceId) {
          await updateResource('problemSpaces', problemSpaceDoc.id, workspaceId, isDryRun);
        }
      }

      if (userIds.length > 10) {
        for (let i = 10; i < userIds.length; i += 10) {
          const batch = userIds.slice(i, i + 10);
          const batchProblemSpacesQuery = await db.collection('problemSpaces')
            .where('userId', 'in', batch)
            .get();
          
          for (const problemSpaceDoc of batchProblemSpacesQuery.docs) {
            const data = problemSpaceDoc.data();
            if (!data.workspaceId) {
              await updateResource('problemSpaces', problemSpaceDoc.id, workspaceId, isDryRun);
            }
          }
        }
      }
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Organizations created: ${stats.organizationsCreated}`);
    console.log(`Workspaces created: ${stats.workspacesCreated}`);
    console.log(`Users updated: ${stats.usersUpdated}`);
    console.log(`Sessions updated: ${stats.sessionsUpdated}`);
    console.log(`Projects updated: ${stats.projectsUpdated}`);
    console.log(`Problem Spaces updated: ${stats.problemSpacesUpdated}`);
    console.log(`Subscriptions created: ${stats.subscriptionsCreated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(err => {
        console.log(`  - ${err.type}: ${err.error}`);
      });
    }

    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
    } else {
      console.log('\n✓ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  if (!isDryRun) {
    console.log('⚠️  WARNING: This will modify your Firestore database!');
    const confirmed = await promptConfirmation('Do you want to continue? (yes/no): ');
    if (!confirmed) {
      console.log('Migration cancelled.');
      process.exit(0);
    }
  }

  await migrate();
  process.exit(0);
})();

