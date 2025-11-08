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

### 6. Create Firestore Indexes (Optional but Recommended)

**Note**: The application works without Firestore composite indexes using fallback queries, but creating indexes will significantly improve query performance, especially as your data grows.

For comprehensive index setup instructions, see **[FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md)**.

**Quick Start:**

1. **Automatic Method (Recommended)**:
   - Use the application normally (create projects, problem spaces, sessions)
   - Check browser console (F12) for index creation links when queries run
   - Click the links to automatically create required indexes
   - Wait 1-5 minutes for indexes to build

2. **Manual Method**:
   - Go to [Firebase Console](https://console.firebase.google.com/) > Firestore Database > Indexes
   - Click "Create Index" and follow the instructions in [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md)

**Required Indexes:**
- `projects`: `(userId, createdAt)` and `(userId, status, createdAt)`
- `problemSpaces`: `(userId, updatedAt)`
- `sessions`: `(projectId, userId, createdAt)`

See [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) for complete details, step-by-step instructions, and troubleshooting tips.

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

## Firebase Hosting Setup

This application uses Firebase Hosting for deployment. Follow these steps to set up hosting:

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

Or use the local version:
```bash
npm install
```

### 2. Login to Firebase

```bash
firebase login
```

This will open your browser to authenticate with your Google account.

### 3. Initialize Firebase Hosting (if not already done)

The project already has `firebase.json` and `.firebaserc` configured. If you need to initialize from scratch:

```bash
firebase init hosting
```

When prompted:
- Use existing project: Yes, select `gist-aa4c1`
- Public directory: `dist`
- Configure as single-page app: Yes
- Set up automatic builds with GitHub: No (optional)

### 4. Deploy

```bash
npm run deploy
```

Or manually:
```bash
npm run build
firebase deploy --only hosting
```

### 5. View Your Site

After deployment, your app will be available at:
- `https://gist-aa4c1.web.app`
- `https://gist-aa4c1.firebaseapp.com`

You can also set up a custom domain in Firebase Console > Hosting > Add custom domain.

### Environment Variables

Firebase Hosting uses environment variables from your `.env` file during the build process. Make sure your `.env` file is properly configured (see step 4 above).

**Note:** For CI/CD deployments, you can use GitHub Actions with Firebase secrets, or configure environment variables in your CI system.

## Next Steps

- Teams functionality can be added later without data migration
- Google SSO can be enabled by adding the provider in Firebase Console
- Additional authentication providers can be added as needed
- Custom domain setup in Firebase Hosting

