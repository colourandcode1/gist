# Phase 6: Testing and Security Audit Guide

This guide provides comprehensive testing procedures for Phase 6 of the multi-tenant security implementation.

## Prerequisites

1. **Firebase Admin SDK Setup**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/scripts/gist-aa4c1-firebase-adminsdk-fbsvc-4dfa75d158.json"
   export FIREBASE_PROJECT_ID="gist-aa4c1"
   ```

2. **Node.js Dependencies**
   ```bash
   npm install firebase-admin
   ```

## Automated Testing Scripts

### Security Testing

Run the security testing script to verify cross-organization data access prevention:

```bash
node scripts/testSecurity.js
```

**What it tests:**
- Organization structure and required fields
- Workspace-organization mapping integrity
- Resource-workspace mapping (sessions, projects, themes)
- Cross-organization data isolation
- Organization requests structure
- User organization membership
- Workspace immutability constraints

### Integration Testing

Run the integration testing script to verify signup and approval flows:

```bash
node scripts/testIntegration.js
```

**What it tests:**
- Signup creates organization and workspace
- Organization join request flow
- Approved requests add users to organizations
- Rejected requests don't add users
- Data isolation between organizations
- Audit log organization scoping

## Manual Testing Checklist

### 6.1 Security Testing

#### Test 1: Cross-Organization Data Access Prevention

**Objective:** Verify users cannot access data from other organizations.

**Steps:**
1. Create two test organizations (Org A and Org B)
2. Create a user in Org A
3. Create a user in Org B
4. As Org A user, attempt to:
   - [ ] Read sessions from Org B
   - [ ] Read projects from Org B
   - [ ] Read themes from Org B
   - [ ] Update resources in Org B
   - [ ] Delete resources in Org B

**Expected Result:** All attempts should be blocked by Firestore security rules.

**How to Verify:**
- Check browser console for `permission-denied` errors
- Verify Firestore rules are blocking access
- Check that UI only shows data from user's organization

#### Test 2: Firestore Rules Verification

**Objective:** Verify Firestore security rules prevent unauthorized access.

**Steps:**
1. Open Firebase Console → Firestore Database → Rules
2. Verify rules are deployed and match `firestore.rules`
3. Test rules using Firebase Console Rules Playground:
   - [ ] Test authenticated user can read own data
   - [ ] Test authenticated user cannot read other org's data
   - [ ] Test unauthenticated user cannot access any data
   - [ ] Test admin can access all data in their organization

**Expected Result:** Rules enforce organization boundaries.

#### Test 3: Organization Join/Approval Flow

**Objective:** Verify the complete join request workflow.

**Steps:**
1. **Create Join Request:**
   - [ ] User signs up and requests to join existing organization
   - [ ] Request appears in `organizationRequests` collection with status `pending`
   - [ ] User's `organizationId` is not set yet

2. **Admin Approval:**
   - [ ] Admin sees pending request in Team Management → Join Requests tab
   - [ ] Admin clicks "Approve"
   - [ ] User is added to organization's `members` array
   - [ ] User's `organizationId` is updated
   - [ ] Request status changes to `approved`
   - [ ] User can now access organization data

3. **Admin Rejection:**
   - [ ] Admin clicks "Reject"
   - [ ] User is NOT added to organization
   - [ ] User's `organizationId` remains unchanged
   - [ ] Request status changes to `rejected`

**Expected Result:** Join flow works correctly with proper data updates.

#### Test 4: Audit Logs Organization Scoping

**Objective:** Verify audit logs only show data from user's organization.

**Steps:**
1. As Org A user:
   - [ ] View audit logs
   - [ ] Verify all logs have `organizationId` matching Org A
   - [ ] Verify no logs from Org B appear

2. As Org B user:
   - [ ] View audit logs
   - [ ] Verify all logs have `organizationId` matching Org B
   - [ ] Verify no logs from Org A appear

**Expected Result:** Audit logs are properly scoped to organization.

### 6.2 Integration Testing

#### Test 1: Signup with New Organization Creation

**Objective:** Verify new users can create their own organization.

**Steps:**
1. [ ] Navigate to signup page
2. [ ] Select "Create new organization"
3. [ ] Enter organization name
4. [ ] Complete signup form
5. [ ] Submit signup

**Expected Result:**
- Organization is created with user as owner
- User is added to organization's `members` array
- Default workspace is created
- User's `organizationId` is set
- User can immediately access the application

**How to Verify:**
- Check Firestore: `organizations` collection has new document
- Check Firestore: `workspaces` collection has new document
- Check Firestore: `users/{userId}` has `organizationId` set
- User can see dashboard and create resources

#### Test 2: Signup with Organization Join Request

**Objective:** Verify users can request to join existing organizations.

**Steps:**
1. [ ] Navigate to signup page
2. [ ] Select "Join existing organization"
3. [ ] Enter organization subdomain or search
4. [ ] Complete signup form
5. [ ] Submit signup

**Expected Result:**
- Join request is created with status `pending`
- User's `organizationId` is NOT set yet
- User sees "Pending approval" message
- Admin receives notification of pending request

**How to Verify:**
- Check Firestore: `organizationRequests` collection has new document
- Check Firestore: `users/{userId}` has `organizationId` as null
- User sees pending approval UI
- Admin sees request in Team Management

#### Test 3: Admin Approval/Rejection Flow

**Objective:** Verify admins can approve or reject join requests.

**Steps:**
1. **As Admin:**
   - [ ] Navigate to Settings → Team → Join Requests tab
   - [ ] See list of pending requests
   - [ ] Click "Approve" on a request

2. **Verify Approval:**
   - [ ] User is added to organization
   - [ ] User's `organizationId` is updated
   - [ ] Request status changes to `approved`
   - [ ] User can now access organization

3. **Test Rejection:**
   - [ ] Click "Reject" on another request
   - [ ] User is NOT added to organization
   - [ ] Request status changes to `rejected`
   - [ ] User remains without organization access

**Expected Result:** Approval/rejection flow works correctly.

#### Test 4: Data Isolation Between Organizations

**Objective:** Verify complete data isolation between organizations.

**Steps:**
1. **Create Test Data:**
   - [ ] Create Org A with User A
   - [ ] Create Org B with User B
   - [ ] User A creates: 1 session, 1 project, 1 theme
   - [ ] User B creates: 1 session, 1 project, 1 theme

2. **Verify Isolation:**
   - [ ] As User A, verify only Org A data is visible
   - [ ] As User A, verify Org B data is NOT visible
   - [ ] As User B, verify only Org B data is visible
   - [ ] As User B, verify Org A data is NOT visible

3. **Verify Workspace Isolation:**
   - [ ] User A's workspaces only show Org A workspaces
   - [ ] User B's workspaces only show Org B workspaces
   - [ ] Resources are properly scoped to workspaces

**Expected Result:** Complete data isolation between organizations.

## Firestore Rules Testing

### Using Firebase Console Rules Playground

1. Go to Firebase Console → Firestore Database → Rules
2. Click "Rules Playground" tab
3. Test scenarios:

**Scenario 1: User reads own session**
- Location: `sessions/{sessionId}`
- Authenticated: Yes
- User ID: `test-user-1`
- Resource data: `{ userId: "test-user-1", workspaceId: "workspace-1" }`
- Operation: Read
- Expected: ✅ Allow

**Scenario 2: User reads other org's session**
- Location: `sessions/{sessionId}`
- Authenticated: Yes
- User ID: `test-user-1`
- Resource data: `{ userId: "test-user-2", workspaceId: "workspace-2" }` (different org)
- Operation: Read
- Expected: ❌ Deny

**Scenario 3: Unauthenticated access**
- Location: `sessions/{sessionId}`
- Authenticated: No
- Operation: Read
- Expected: ❌ Deny

## Browser Console Testing

### Test Cross-Organization Access Attempts

Open browser console and run:

```javascript
// Try to read a session from another organization
// This should fail with permission-denied
const otherOrgSessionId = 'session-from-other-org';
const sessionRef = firebase.firestore().collection('sessions').doc(otherOrgSessionId);
sessionRef.get().then(doc => {
  console.log('❌ SECURITY ISSUE: Could read other org session!', doc.data());
}).catch(error => {
  if (error.code === 'permission-denied') {
    console.log('✅ Security working: Access denied');
  } else {
    console.error('Error:', error);
  }
});
```

## Performance Testing

### Test Query Performance with Organization Filtering

1. **Measure query times:**
   - [ ] Query sessions with workspaceIds filter
   - [ ] Query projects with workspaceIds filter
   - [ ] Query themes with workspaceIds filter

2. **Verify indexes:**
   - [ ] Check Firebase Console → Firestore → Indexes
   - [ ] Ensure composite indexes exist for workspaceId queries
   - [ ] Create missing indexes if needed

## Reporting Issues

If tests fail:

1. **Document the failure:**
   - Which test failed
   - Expected vs actual behavior
   - Error messages from console
   - Firestore rules status

2. **Check common issues:**
   - Firestore rules not deployed
   - Missing Firestore indexes
   - User not properly authenticated
   - Organization/workspace data not properly set

3. **Review security:**
   - Verify rules match `firestore.rules`
   - Check application-level filtering is working
   - Verify workspaceId is set on all resources

## Success Criteria

All tests should pass:
- ✅ No cross-organization data access
- ✅ Firestore rules prevent unauthorized access
- ✅ Join/approval flow works correctly
- ✅ Audit logs are organization-scoped
- ✅ Signup creates organization correctly
- ✅ Data isolation is complete

## Next Steps

After completing all tests:
1. Review any warnings from automated scripts
2. Address any failed tests
3. Document any edge cases found
4. Update security rules if needed
5. Deploy to production with confidence

