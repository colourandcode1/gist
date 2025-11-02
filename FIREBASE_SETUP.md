# Firebase Setup Guide

This application now uses Firebase Authentication and Firestore for user management and data storage.

## Required Firebase Configuration

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. (Optional for future) You can also enable **Google** sign-in provider

### 3. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Start in **test mode** for development (we'll add security rules below)
4. Choose a location for your database

### 4. Configure Environment Variables

Create a `.env` file in the root of your project:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

To find these values:
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. If you don't have a web app, click "Add app" and select the web icon (`</>`)
4. Copy the config values to your `.env` file

### 5. Set Up Firestore Security Rules

In Firebase Console, go to **Firestore Database** > **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sessions: users can only access their own sessions or team sessions they belong to
    match /sessions/{sessionId} {
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        resource.data.teamId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teams
      );
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

**Note:** For production, you'll need to refine these rules, especially when implementing teams functionality.

### 6. Create Firestore Indexes (if needed)

If you see errors about missing indexes when fetching sessions:
1. Check the browser console for index creation links
2. Click the links to automatically create the required indexes
3. Or manually create indexes in Firebase Console > Firestore > Indexes

### 7. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to the app
3. You should be redirected to `/login` if not authenticated
4. Create a new account
5. After signing up, you should be logged in and able to use the app

## User Roles

The system supports three user roles:
- **admin**: Full access
- **researcher**: Can create and edit sessions/nuggets (default for new users)
- **viewer**: Read-only access (not yet fully implemented)

User roles are stored in Firestore under `users/{userId}/role`. To change a user's role:
1. Go to Firebase Console > Firestore Database
2. Navigate to `users` collection
3. Find the user document
4. Update the `role` field

## Data Migration

Existing localStorage data is not automatically migrated. Users will start with empty sessions after signing up. If you need to migrate existing data:

1. Export data from localStorage
2. Create a migration script to import it into Firestore
3. Assign data to the correct userId

## Next Steps

- Teams functionality can be added later without data migration
- Google SSO can be enabled by adding the provider in Firebase Console
- Additional authentication providers can be added as needed

