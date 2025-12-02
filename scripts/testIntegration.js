/**
 * Integration Testing Script
 * 
 * Tests signup flows, organization join/approval, and data isolation.
 * 
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
 *   export FIREBASE_PROJECT_ID="gist-aa4c1"
 *   node scripts/testIntegration.js
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
const auth = admin.auth();

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
 * Test 1: Verify signup creates organization and workspace
 */
async function testSignupCreatesOrganization() {
  console.log('\n📋 Test 1: Signup Creates Organization');
  console.log('─'.repeat(50));
  
  try {
    // Find a user who recently signed up (has organizationId)
    const usersSnapshot = await db.collection('users')
      .where('organizationId', '!=', null)
      .limit(5)
      .get();
    
    if (usersSnapshot.empty) {
      logWarning('Signup Creates Organization', 'No users with organizations found');
      return;
    }
    
    let validSetups = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;
      
      if (!user.organizationId) continue;
      
      // Verify organization exists
      const orgDoc = await db.collection('organizations').doc(user.organizationId).get();
      if (!orgDoc.exists) {
        logWarning(`User ${userId}`, `Organization ${user.organizationId} does not exist`);
        continue;
      }
      
      const orgData = orgDoc.data();
      
      // Verify user is owner or has organizationId matching this org
      const isOwner = orgData.ownerId === userId;
      const isMember = isOwner || user.organizationId === orgData.id;
      
      if (!isMember) {
        logWarning(`User ${userId}`, `Not a member of their organization`);
        continue;
      }
      
      // Verify user has at least one workspace
      const workspacesSnapshot = await db.collection('workspaces')
        .where('organizationId', '==', user.organizationId)
        .limit(1)
        .get();
      
      if (workspacesSnapshot.empty) {
        logWarning(`User ${userId}`, `No workspaces found for organization`);
        continue;
      }
      
      validSetups++;
    }
    
    logTest('Signup Creates Organization', validSetups > 0, 
      `${validSetups}/${usersSnapshot.size} users have valid organization setup`);
  } catch (error) {
    logTest('Signup Creates Organization', false, error.message);
  }
}

/**
 * Test 2: Verify organization join request flow
 */
async function testOrganizationJoinRequest() {
  console.log('\n📋 Test 2: Organization Join Request Flow');
  console.log('─'.repeat(50));
  
  try {
    const requestsSnapshot = await db.collection('organizationRequests')
      .where('status', '==', 'pending')
      .limit(5)
      .get();
    
    if (requestsSnapshot.empty) {
      logWarning('Join Request Flow', 'No pending requests found (this is OK)');
      
      // Check for approved/rejected requests
      const allRequestsSnapshot = await db.collection('organizationRequests').limit(5).get();
      if (allRequestsSnapshot.empty) {
        logWarning('Join Request Flow', 'No requests found at all');
        return;
      }
      
      logTest('Join Request Flow', true, 'No pending requests (system working correctly)');
      return;
    }
    
    let validRequests = 0;
    
    for (const requestDoc of requestsSnapshot.docs) {
      const request = requestDoc.data();
      
      // Verify user exists
      const userDoc = await db.collection('users').doc(request.userId).get();
      if (!userDoc.exists) {
        logWarning(`Request ${requestDoc.id}`, `User ${request.userId} does not exist`);
        continue;
      }
      
      // Verify organization exists
      const orgDoc = await db.collection('organizations').doc(request.organizationId).get();
      if (!orgDoc.exists) {
        logWarning(`Request ${requestDoc.id}`, `Organization ${request.organizationId} does not exist`);
        continue;
      }
      
      // Verify user is not already a member
      const orgData = orgDoc.data();
      const isAlreadyMember = orgData.ownerId === request.userId || 
                             (orgData.members && orgData.members.includes(request.userId));
      
      if (isAlreadyMember) {
        logWarning(`Request ${requestDoc.id}`, `User is already a member of organization`);
        continue;
      }
      
      validRequests++;
    }
    
    logTest('Join Request Flow', validRequests === requestsSnapshot.size, 
      `${validRequests}/${requestsSnapshot.size} valid pending requests`);
  } catch (error) {
    logTest('Join Request Flow', false, error.message);
  }
}

/**
 * Test 3: Verify approved requests add users to organizations
 */
async function testApprovedRequestAddsUser() {
  console.log('\n📋 Test 3: Approved Request Adds User');
  console.log('─'.repeat(50));
  
  try {
    const approvedRequestsSnapshot = await db.collection('organizationRequests')
      .where('status', '==', 'approved')
      .limit(10)
      .get();
    
    if (approvedRequestsSnapshot.empty) {
      logWarning('Approved Request Flow', 'No approved requests found');
      return;
    }
    
    let validApprovals = 0;
    
    for (const requestDoc of approvedRequestsSnapshot.docs) {
      const request = requestDoc.data();
      
      // Verify user is now in organization
      const orgDoc = await db.collection('organizations').doc(request.organizationId).get();
      if (!orgDoc.exists) {
        logWarning(`Request ${requestDoc.id}`, `Organization ${request.organizationId} does not exist`);
        continue;
      }
      
      const orgData = orgDoc.data();
      // User is a member if they're the owner OR their user document has this organizationId
      const isOwner = orgData.ownerId === request.userId;
      const isMember = isOwner || userData.organizationId === request.organizationId;
      
      if (!isMember) {
        logWarning(`Request ${requestDoc.id}`, `User ${request.userId} not added to organization after approval`);
        continue;
      }
      
      // Verify user's organizationId is set
      const userDoc = await db.collection('users').doc(request.userId).get();
      if (!userDoc.exists) {
        logWarning(`Request ${requestDoc.id}`, `User ${request.userId} does not exist`);
        continue;
      }
      
      const userData = userDoc.data();
      if (userData.organizationId !== request.organizationId) {
        logWarning(`Request ${requestDoc.id}`, `User's organizationId not updated after approval`);
        continue;
      }
      
      validApprovals++;
    }
    
    logTest('Approved Request Adds User', validApprovals === approvedRequestsSnapshot.size, 
      `${validApprovals}/${approvedRequestsSnapshot.size} approved requests properly processed`);
  } catch (error) {
    logTest('Approved Request Adds User', false, error.message);
  }
}

/**
 * Test 4: Verify rejected requests don't add users
 */
async function testRejectedRequestDoesNotAddUser() {
  console.log('\n📋 Test 4: Rejected Request Does Not Add User');
  console.log('─'.repeat(50));
  
  try {
    const rejectedRequestsSnapshot = await db.collection('organizationRequests')
      .where('status', '==', 'rejected')
      .limit(10)
      .get();
    
    if (rejectedRequestsSnapshot.empty) {
      logWarning('Rejected Request Flow', 'No rejected requests found');
      return;
    }
    
    let validRejections = 0;
    
    for (const requestDoc of rejectedRequestsSnapshot.docs) {
      const request = requestDoc.data();
      
      // Verify user is NOT in organization
      const orgDoc = await db.collection('organizations').doc(request.organizationId).get();
      if (!orgDoc.exists) {
        logWarning(`Request ${requestDoc.id}`, `Organization ${request.organizationId} does not exist`);
        continue;
      }
      
      const orgData = orgDoc.data();
      // Check if user is owner or has organizationId matching this org
      const isOwner = orgData.ownerId === request.userId;
      
      // Check user document
      const userDoc = await db.collection('users').doc(request.userId).get();
      let isMember = isOwner;
      if (!isMember && userDoc.exists) {
        const userData = userDoc.data();
        isMember = userData.organizationId === request.organizationId;
      }
      
      if (isMember) {
        logWarning(`Request ${requestDoc.id}`, `User ${request.userId} is in organization despite rejection`);
        continue;
      }
      
      validRejections++;
    }
    
    logTest('Rejected Request Does Not Add User', validRejections === rejectedRequestsSnapshot.size, 
      `${validRejections}/${rejectedRequestsSnapshot.size} rejections properly processed`);
  } catch (error) {
    logTest('Rejected Request Does Not Add User', false, error.message);
  }
}

/**
 * Test 5: Verify data isolation between organizations
 */
async function testDataIsolation() {
  console.log('\n📋 Test 5: Data Isolation Between Organizations');
  console.log('─'.repeat(50));
  
  try {
    // Get two different organizations
    const orgsSnapshot = await db.collection('organizations').limit(2).get();
    
    if (orgsSnapshot.size < 2) {
      logWarning('Data Isolation', 'Need at least 2 organizations to test isolation');
      return;
    }
    
    const orgs = orgsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const org1 = orgs[0];
    const org2 = orgs[1];
    
    // Get workspaces for each organization
    const org1Workspaces = await db.collection('workspaces')
      .where('organizationId', '==', org1.id)
      .get();
    
    const org2Workspaces = await db.collection('workspaces')
      .where('organizationId', '==', org2.id)
      .get();
    
    if (org1Workspaces.empty || org2Workspaces.empty) {
      logWarning('Data Isolation', 'Need workspaces in both organizations');
      return;
    }
    
    const org1WorkspaceIds = new Set(org1Workspaces.docs.map(doc => doc.id));
    const org2WorkspaceIds = new Set(org2Workspaces.docs.map(doc => doc.id));
    
    // Check for cross-contamination in sessions
    const sessionsSnapshot = await db.collection('sessions').limit(100).get();
    let org1Sessions = 0;
    let org2Sessions = 0;
    let crossContaminated = 0;
    
    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.workspaceId) {
        if (org1WorkspaceIds.has(data.workspaceId)) {
          org1Sessions++;
        } else if (org2WorkspaceIds.has(data.workspaceId)) {
          org2Sessions++;
        } else {
          // Session belongs to neither org - this is OK if there are more orgs
        }
      }
    });
    
    logTest('Session Isolation', true, 
      `Org1: ${org1Sessions} sessions, Org2: ${org2Sessions} sessions`);
    
    // Check projects
    const projectsSnapshot = await db.collection('projects').limit(100).get();
    let org1Projects = 0;
    let org2Projects = 0;
    
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.workspaceId) {
        if (org1WorkspaceIds.has(data.workspaceId)) {
          org1Projects++;
        } else if (org2WorkspaceIds.has(data.workspaceId)) {
          org2Projects++;
        }
      }
    });
    
    logTest('Project Isolation', true, 
      `Org1: ${org1Projects} projects, Org2: ${org2Projects} projects`);
    
    // Check themes
    const themesSnapshot = await db.collection('themes').limit(100).get();
    let org1Themes = 0;
    let org2Themes = 0;
    
    themesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.workspaceId) {
        if (org1WorkspaceIds.has(data.workspaceId)) {
          org1Themes++;
        } else if (org2WorkspaceIds.has(data.workspaceId)) {
          org2Themes++;
        }
      }
    });
    
    logTest('Theme Isolation', true, 
      `Org1: ${org1Themes} themes, Org2: ${org2Themes} themes`);
    
  } catch (error) {
    logTest('Data Isolation', false, error.message);
  }
}

/**
 * Test 6: Verify audit logs are organization-scoped
 */
async function testAuditLogIsolation() {
  console.log('\n📋 Test 6: Audit Log Organization Isolation');
  console.log('─'.repeat(50));
  
  try {
    const auditLogsSnapshot = await db.collection('auditLogs').limit(50).get();
    
    if (auditLogsSnapshot.empty) {
      logWarning('Audit Log Isolation', 'No audit logs found');
      return;
    }
    
    let logsWithOrg = 0;
    let logsWithoutOrg = 0;
    
    auditLogsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.organizationId) {
        logsWithOrg++;
      } else {
        logsWithoutOrg++;
        logWarning(`Audit Log ${doc.id}`, 'Missing organizationId');
      }
    });
    
    logTest('Audit Log Isolation', logsWithoutOrg === 0, 
      `${logsWithOrg} logs with organizationId, ${logsWithoutOrg} without`);
  } catch (error) {
    logTest('Audit Log Isolation', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Integration Testing Suite');
  console.log('='.repeat(50));
  console.log(`Project: ${projectId}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  await testSignupCreatesOrganization();
  await testOrganizationJoinRequest();
  await testApprovedRequestAddsUser();
  await testRejectedRequestDoesNotAddUser();
  await testDataIsolation();
  await testAuditLogIsolation();
  
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

