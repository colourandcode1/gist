# Firestore Security Rules

## Quick Setup

The Firestore security rules are now managed in the `firestore.rules` file. You can deploy them using Firebase CLI or copy them to the Firebase Console.

### Option 1: Deploy using Firebase CLI (Recommended)

```bash
firebase deploy --only firestore:rules
```

### Option 2: Manual Setup via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`gist-aa4c1`)
3. Go to **Firestore Database** > **Rules**
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

## Security Rules Overview

The rules include permissions for all collections:

- **users**: Users can read/write their own profile; admins can read all
- **sessions**: Users can create/read/update/delete their own sessions; admins have full access
- **projects**: Users can create/read/update/delete their own projects; admins have full access
- **problemSpaces**: Members can create/read/update/delete their own problem spaces; problem space contributors (collaborators) can read/update; admins have full access
- **comments**: Users can create comments and manage their own; admins can manage all
- **shareLinks**: Anyone can read (for sharing); creators can manage; admins have full access
- **teams**: Team members can read; owners/admins can update; admins have full access
- **teamMembers**: Team members can read; admins can manage
- **teamInvitations**: Users can manage invitations they sent/received; admins have full access
- **activities**: Users can create; admins can manage all

## Admin Role

Users with `role: 'member'` and `is_admin: true` in their user document have elevated permissions across all collections. Admin is now a permission flag on the Member role, not a separate role.

To set a user as admin:

1. Go to Firebase Console > Firestore Database
2. Navigate to `users` collection
3. Find the user document
4. Ensure `role` field is set to `'member'`
5. Set `is_admin` field to `true`

## Complete Rules

See `firestore.rules` file for the complete rules definition.

## Firestore Indexes

The application uses Firestore composite indexes to optimize query performance. While the app works without indexes (using fallback queries), creating indexes significantly improves performance.

**For comprehensive index setup instructions, see [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md).**

**Quick Reference - Required Indexes:**
- `projects`: `(userId, createdAt)`, `(userId, status, createdAt)`
- `problemSpaces`: `(userId, updatedAt)`
- `sessions`: `(projectId, userId, createdAt)`

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

