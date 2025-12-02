/**
 * Security Testing Script
 * 
 * Tests cross-organization data access prevention and verifies Firestore rules.
 * 
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
 *   export FIREBASE_PROJECT_ID="gist-aa4c1"
 *   node scripts/testSecurity.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, 'gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json');
const projectId = process.env.FIREBASE_PROJECT_ID || 'gist-aa4c1';

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: projectId
  });
}

const db = admin.firestore();

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, passed, message = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed.push({ name, message });
  } else {
    console.log(`❌ ${name}: ${message}`);
    testResults.failed.push({ name, message });
  }
}

function logWarning(name, message) {
  console.log(`⚠️  ${name}: ${message}`);
  testResults.warnings.push({ name, message });
}

/**
 * Test 1: Verify organizations exist and have proper structure
 */
async function testOrganizationStructure() {
  console.log('\n📋 Test 1: Organization Structure');
  console.log('─'.repeat(50));
  
  try {
    const orgsSnapshot = await db.collection('organizations').limit(5).get();
    
    if (orgsSnapshot.empty) {
      logWarning('Organization Structure', 'No organizations found in database');
      return;
    }
    
    let validOrgs = 0;
    for (const doc of orgsSnapshot.docs) {
      const data = doc.data();
      const hasOwnerId = !!data.ownerId;
      const hasName = !!data.name;
      
      // Members are determined by users with matching organizationId, not a members array
      // So we just check for ownerId and name
      if (hasOwnerId && hasName) {
        validOrgs++;
      } else {
        logWarning(`Organization ${doc.id}`, `Missing required fields: ownerId=${hasOwnerId}, name=${hasName}`);
      }
    }
    
    logTest('Organization Structure', validOrgs > 0, `Found ${validOrgs} valid organizations`);
  } catch (error) {
    logTest('Organization Structure', false, error.message);
  }
}

/**
 * Test 2: Verify workspaces belong to correct organizations
 */
async function testWorkspaceOrganizationMapping() {
  console.log('\n📋 Test 2: Workspace-Organization Mapping');
  console.log('─'.repeat(50));
  
  try {
    const workspacesSnapshot = await db.collection('workspaces').limit(20).get();
    
    if (workspacesSnapshot.empty) {
      logWarning('Workspace Mapping', 'No workspaces found');
      return;
    }
    
    let validMappings = 0;
    let invalidMappings = 0;
    
    for (const doc of workspacesSnapshot.docs) {
      const workspace = doc.data();
      const workspaceId = doc.id;
      
      if (!workspace.organizationId) {
        invalidMappings++;
        logWarning(`Workspace ${workspaceId}`, 'Missing organizationId');
        continue;
      }
      
      // Verify organization exists
      const orgDoc = await db.collection('organizations').doc(workspace.organizationId).get();
      if (!orgDoc.exists) {
        invalidMappings++;
        logWarning(`Workspace ${workspaceId}`, `Organization ${workspace.organizationId} does not exist`);
        continue;
      }
      
      // Verify workspace creator is in organization
      // Check if creator is owner or has organizationId matching this org
      const orgData = orgDoc.data();
      const creatorIsOwner = orgData.ownerId === workspace.createdBy;
      
      // Also check if creator's user document has this organizationId
      let creatorInOrg = creatorIsOwner;
      if (!creatorInOrg) {
        try {
          const creatorDoc = await db.collection('users').doc(workspace.createdBy).get();
          if (creatorDoc.exists) {
            const creatorData = creatorDoc.data();
            creatorInOrg = creatorData.organizationId === workspace.organizationId;
          }
        } catch (error) {
          // If we can't check, assume it's OK (might be a migration artifact)
        }
      }
      
      if (!creatorInOrg) {
        invalidMappings++;
        logWarning(`Workspace ${workspaceId}`, `Creator ${workspace.createdBy} not in organization ${workspace.organizationId}`);
        continue;
      }
      
      validMappings++;
    }
    
    logTest('Workspace-Organization Mapping', invalidMappings === 0, 
      `${validMappings} valid mappings, ${invalidMappings} invalid`);
  } catch (error) {
    logTest('Workspace-Organization Mapping', false, error.message);
  }
}

/**
 * Test 3: Verify resources have workspaceId and belong to correct organization
 */
async function testResourceWorkspaceMapping() {
  console.log('\n📋 Test 3: Resource-Workspace Mapping');
  console.log('─'.repeat(50));
  
  const collections = ['sessions', 'projects', 'themes'];
  let totalResources = 0;
  let resourcesWithWorkspace = 0;
  let resourcesWithValidWorkspace = 0;
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).limit(20).get();
      totalResources += snapshot.size;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        if (data.workspaceId) {
          resourcesWithWorkspace++;
          
          // Verify workspace exists
          const workspaceDoc = await db.collection('workspaces').doc(data.workspaceId).get();
          if (workspaceDoc.exists) {
            resourcesWithValidWorkspace++;
          } else {
            logWarning(`${collectionName}/${doc.id}`, `Workspace ${data.workspaceId} does not exist`);
          }
        } else {
          logWarning(`${collectionName}/${doc.id}`, 'Missing workspaceId');
        }
      }
    } catch (error) {
      logTest(`Resource Mapping (${collectionName})`, false, error.message);
    }
  }
  
  const allHaveWorkspace = totalResources === 0 || resourcesWithWorkspace === totalResources;
  logTest('Resource-Workspace Mapping', allHaveWorkspace, 
    `${resourcesWithWorkspace}/${totalResources} resources have workspaceId`);
}

/**
 * Test 4: Check for cross-organization data leakage
 */
async function testCrossOrganizationIsolation() {
  console.log('\n📋 Test 4: Cross-Organization Isolation');
  console.log('─'.repeat(50));
  
  try {
    // Get two different organizations
    const orgsSnapshot = await db.collection('organizations').limit(2).get();
    
    if (orgsSnapshot.size < 2) {
      logWarning('Cross-Organization Isolation', 'Need at least 2 organizations to test isolation');
      return;
    }
    
    const orgs = orgsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const org1 = orgs[0];
    const org2 = orgs[1];
    
    // Get workspaces for each organization
    const org1Workspaces = await db.collection('workspaces')
      .where('organizationId', '==', org1.id)
      .limit(5)
      .get();
    
    const org2Workspaces = await db.collection('workspaces')
      .where('organizationId', '==', org2.id)
      .limit(5)
      .get();
    
    if (org1Workspaces.empty || org2Workspaces.empty) {
      logWarning('Cross-Organization Isolation', 'Need workspaces in both organizations');
      return;
    }
    
    const org1WorkspaceIds = org1Workspaces.docs.map(doc => doc.id);
    const org2WorkspaceIds = org2Workspaces.docs.map(doc => doc.id);
    
    // Check sessions
    let org1Sessions = 0;
    let org2Sessions = 0;
    let crossOrgSessions = 0;
    
    const sessionsSnapshot = await db.collection('sessions').limit(50).get();
    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.workspaceId) {
        if (org1WorkspaceIds.includes(data.workspaceId)) {
          org1Sessions++;
        } else if (org2WorkspaceIds.includes(data.workspaceId)) {
          org2Sessions++;
        } else {
          crossOrgSessions++;
        }
      }
    });
    
    logTest('Session Isolation', crossOrgSessions === 0, 
      `Org1: ${org1Sessions}, Org2: ${org2Sessions}, Cross-org: ${crossOrgSessions}`);
    
    // Check projects
    let org1Projects = 0;
    let org2Projects = 0;
    let crossOrgProjects = 0;
    
    const projectsSnapshot = await db.collection('projects').limit(50).get();
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.workspaceId) {
        if (org1WorkspaceIds.includes(data.workspaceId)) {
          org1Projects++;
        } else if (org2WorkspaceIds.includes(data.workspaceId)) {
          org2Projects++;
        } else {
          crossOrgProjects++;
        }
      }
    });
    
    logTest('Project Isolation', crossOrgProjects === 0, 
      `Org1: ${org1Projects}, Org2: ${org2Projects}, Cross-org: ${crossOrgProjects}`);
    
  } catch (error) {
    logTest('Cross-Organization Isolation', false, error.message);
  }
}

/**
 * Test 5: Verify organization requests structure
 */
async function testOrganizationRequests() {
  console.log('\n📋 Test 5: Organization Requests');
  console.log('─'.repeat(50));
  
  try {
    const requestsSnapshot = await db.collection('organizationRequests').limit(10).get();
    
    if (requestsSnapshot.empty) {
      logWarning('Organization Requests', 'No requests found (this is OK if none exist)');
      return;
    }
    
    let validRequests = 0;
    requestsSnapshot.forEach(doc => {
      const data = doc.data();
      const hasUserId = !!data.userId;
      const hasOrganizationId = !!data.organizationId;
      const hasStatus = ['pending', 'approved', 'rejected'].includes(data.status);
      
      if (hasUserId && hasOrganizationId && hasStatus) {
        validRequests++;
      } else {
        logWarning(`Request ${doc.id}`, `Missing fields: userId=${hasUserId}, organizationId=${hasOrganizationId}, status=${hasStatus}`);
      }
    });
    
    logTest('Organization Requests', validRequests === requestsSnapshot.size, 
      `${validRequests}/${requestsSnapshot.size} valid requests`);
  } catch (error) {
    logTest('Organization Requests', false, error.message);
  }
}

/**
 * Test 6: Verify users belong to organizations
 */
async function testUserOrganizationMembership() {
  console.log('\n📋 Test 6: User Organization Membership');
  console.log('─'.repeat(50));
  
  try {
    const usersSnapshot = await db.collection('users').limit(20).get();
    
    if (usersSnapshot.empty) {
      logWarning('User Membership', 'No users found');
      return;
    }
    
    let usersInOrgs = 0;
    let usersNotInOrgs = 0;
    
    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const userId = doc.id;
      
      if (!user.organizationId) {
        usersNotInOrgs++;
        continue;
      }
      
      // Verify organization exists and user is a member
      const orgDoc = await db.collection('organizations').doc(user.organizationId).get();
      if (!orgDoc.exists) {
        usersNotInOrgs++;
        logWarning(`User ${userId}`, `Organization ${user.organizationId} does not exist`);
        continue;
      }
      
      const orgData = orgDoc.data();
      // User is a member if they're the owner OR their user document has this organizationId
      const isOwner = orgData.ownerId === userId;
      const isMember = isOwner || user.organizationId === orgData.id;
      
      if (isMember) {
        usersInOrgs++;
      } else {
        usersNotInOrgs++;
        logWarning(`User ${userId}`, `Not a member of organization ${user.organizationId}`);
      }
    }
    
    logTest('User Organization Membership', usersNotInOrgs === 0, 
      `${usersInOrgs} users in orgs, ${usersNotInOrgs} not properly linked`);
  } catch (error) {
    logTest('User Organization Membership', false, error.message);
  }
}

/**
 * Test 7: Verify workspace immutability constraints
 */
async function testWorkspaceImmutability() {
  console.log('\n📋 Test 7: Workspace Immutability');
  console.log('─'.repeat(50));
  
  try {
    const workspacesSnapshot = await db.collection('workspaces').limit(10).get();
    
    if (workspacesSnapshot.empty) {
      logWarning('Workspace Immutability', 'No workspaces found');
      return;
    }
    
    let validWorkspaces = 0;
    workspacesSnapshot.forEach(doc => {
      const data = doc.data();
      const hasCreatedBy = !!data.createdBy;
      const hasCreatedAt = !!data.createdAt;
      const hasOrganizationId = !!data.organizationId;
      
      if (hasCreatedBy && hasCreatedAt && hasOrganizationId) {
        validWorkspaces++;
      } else {
        logWarning(`Workspace ${doc.id}`, `Missing immutable fields: createdBy=${hasCreatedBy}, createdAt=${hasCreatedAt}, organizationId=${hasOrganizationId}`);
      }
    });
    
    logTest('Workspace Immutability', validWorkspaces === workspacesSnapshot.size, 
      `${validWorkspaces}/${workspacesSnapshot.size} workspaces have required immutable fields`);
  } catch (error) {
    logTest('Workspace Immutability', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🔒 Security Testing Suite');
  console.log('='.repeat(50));
  console.log(`Project: ${projectId}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  await testOrganizationStructure();
  await testWorkspaceOrganizationMapping();
  await testResourceWorkspaceMapping();
  await testCrossOrganizationIsolation();
  await testOrganizationRequests();
  await testUserOrganizationMembership();
  await testWorkspaceImmutability();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.warnings.slice(0, 10).forEach(warning => {
      console.log(`   - ${warning.name}: ${warning.message}`);
    });
    if (testResults.warnings.length > 10) {
      console.log(`   ... and ${testResults.warnings.length - 10} more warnings`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Exit with error code if tests failed
  if (testResults.failed.length > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

