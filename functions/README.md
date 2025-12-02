# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the application.

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

## Available Functions

### `checkSubdomainAvailability`

Checks if a subdomain is available for organization creation.

- **Callable**: Yes (can be called without authentication)
- **Input**: `{ subdomain: string }`
- **Output**: `{ available: boolean, error?: string }`

This function:
- Validates subdomain format server-side
- Checks Firestore for existing subdomains using Admin SDK
- Returns only availability status (no sensitive data)
- Works for unauthenticated users (signup flow)

## Development

### Local Testing

To test functions locally using the Firebase Emulator:

```bash
# From project root
firebase emulators:start --only functions
```

### Deploy Functions

```bash
# From project root
firebase deploy --only functions
```

Or deploy a specific function:

```bash
firebase deploy --only functions:checkSubdomainAvailability
```

### View Logs

```bash
firebase functions:log
```

Or view logs for a specific function:

```bash
firebase functions:log --only checkSubdomainAvailability
```

## Dependencies

- `firebase-admin`: Admin SDK for server-side Firestore access
- `firebase-functions`: Firebase Functions SDK

## Notes

- Functions use Node.js 18 runtime
- Admin SDK bypasses Firestore security rules (for internal checks only)
- Functions are automatically rate-limited by Firebase

