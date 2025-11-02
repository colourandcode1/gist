# Troubleshooting Firestore 400 Errors

## Symptoms
- `400 (Bad Request)` errors when trying to save nuggets
- `WebChannelConnection RPC 'Write' stream transport errored` warnings
- App loads but cannot save data

## Checklist

### 1. Verify Firestore Database is Created
**Critical:** Firestore Database must be created before you can use it!

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`gist-aa4c1`)
3. Click **Firestore Database** in the left menu
4. **If you see "Create database" button:**
   - Click it
   - Choose "Start in test mode" (we'll add rules next)
   - Select a location (choose closest to your users)
   - Click "Enable"
5. **If you see the database interface:** You're good! Skip to step 2.

### 2. Set Up Security Rules

1. In Firestore Database, click the **Rules** tab
2. You should see existing rules (might be empty or test mode)
3. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Sessions collection
    match /sessions/{sessionId} {
      allow create: if isAuthenticated() && 
                     request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if isAuthenticated() && 
                                    resource.data.userId == request.auth.uid;
    }
  }
}
```

4. Click **Publish** (top right)
5. Wait 10-30 seconds for rules to propagate

### 3. Verify Rules Are Active

After publishing:
1. Check the Rules tab shows "Published" status
2. Try saving a nugget again
3. If still failing, check browser console for the exact error

### 4. Temporary Test Mode (Development Only)

If you're still having issues, temporarily use test mode (NOT for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ WARNING:** This allows anyone to read/write for 30 days. Only use for testing!

### 5. Verify Authentication

1. Check that you're logged in (check the browser console for `currentUser`)
2. Verify the user ID matches: console.log `currentUser.uid` in your app
3. Make sure Authentication is enabled:
   - Go to **Authentication** > **Sign-in method**
   - Ensure **Email/Password** is enabled

### 6. Check Browser Console

Look for these specific errors:
- `permission-denied` = Security rules are blocking the operation
- `unauthenticated` = User is not logged in
- `not-found` = Database doesn't exist
- `invalid-argument` = Data format issue

### 7. Common Mistakes

- ❌ Forgot to click **Publish** after editing rules
- ❌ Rules syntax error (check for typos)
- ❌ Firestore database not created
- ❌ User not authenticated
- ❌ Wrong project selected in Firebase Console

## Still Not Working?

1. **Double-check project name:** Make sure you're editing rules for `gist-aa4c1`
2. **Check Firebase config:** Verify your `.env` or GitHub Secrets have the correct project ID
3. **Hard refresh:** Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check network tab:** Look at the actual Firestore request in browser DevTools > Network tab for more details

