# Firestore Security Rules

## Quick Setup

Copy these rules to your Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`gist-aa4c1`)
3. Go to **Firestore Database** > **Rules**
4. Replace the existing rules with the code below
5. Click **Publish**

## Recommended Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can read/write their own profile
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Sessions collection
    match /sessions/{sessionId} {
      // Users can create sessions if they're authenticated and set themselves as owner
      allow create: if isAuthenticated() && 
                     request.resource.data.userId == request.auth.uid;
      
      // Users can read their own sessions
      allow read: if isAuthenticated() && 
                  resource.data.userId == request.auth.uid;
      
      // Users can update their own sessions
      allow update: if isAuthenticated() && 
                    resource.data.userId == request.auth.uid;
      
      // Users can delete their own sessions
      allow delete: if isAuthenticated() && 
                     resource.data.userId == request.auth.uid;
    }
  }
}
```

## Testing

After updating the rules:
1. Try saving a session again
2. Check the browser console (F12) for any error messages
3. If you see permission errors, verify:
   - You're logged in
   - The `userId` field in the session matches your `auth.uid`
   - The rules were published successfully

## Common Issues

### "Missing or insufficient permissions"
- Make sure you're logged in
- Verify the security rules were published
- Check that `request.resource.data.userId == request.auth.uid` in the create rule

### Rules syntax errors
- Make sure the rules are valid JavaScript
- Check for typos in field names (`userId`, not `userID`)

### Rules not taking effect
- Wait a few seconds after publishing
- Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

