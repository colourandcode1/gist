#!/usr/bin/env node

/**
 * Migration Script: Migrate problemSpaces collection to themes collection
 * 
 * This script:
 * 1. Copies all documents from 'problemSpaces' collection to 'themes' collection
 * 2. Preserves all document IDs and data
 * 3. Handles errors gracefully
 * 4. Provides rollback capability
 * 
 * Usage:
 *   node scripts/migrateProblemSpacesToThemes.js [--dry-run] [--rollback]
 * 
 * Options:
 *   --dry-run: Preview changes without making them
 *   --rollback: Delete all documents from themes collection (use with caution)
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');

// Initialize Firebase Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    const initOptions = {
      credential: admin.credential.applicationDefault()
    };
    
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

// Statistics tracking
const stats = {
  documentsProcessed: 0,
  documentsCopied: 0,
  documentsDeleted: 0,
  errors: []
};

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

// Copy a single document from problemSpaces to themes
async function copyDocument(docSnapshot, isDryRun) {
  const docId = docSnapshot.id;
  const docData = docSnapshot.data();

  if (isDryRun) {
    console.log(`[DRY RUN] Would copy document: ${docId}`);
    return { success: true };
  }

  try {
    // Copy document to themes collection with same ID
    await db.collection('themes').doc(docId).set(docData);
    stats.documentsCopied++;
    console.log(`✓ Copied document: ${docId}`);
    return { success: true };
  } catch (error) {
    console.error(`✗ Error copying document ${docId}:`, error.message);
    stats.errors.push({ docId, error: error.message });
    return { success: false, error: error.message };
  }
}

// Rollback: Delete all documents from themes collection
async function rollback(isDryRun) {
  console.log('\n=== Rollback: Deleting all documents from themes collection ===\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    const themesSnapshot = await db.collection('themes').get();
    const themes = themesSnapshot.docs;

    console.log(`Found ${themes.size} documents in themes collection\n`);

    if (themes.size === 0) {
      console.log('No documents found in themes collection. Nothing to rollback.');
      return;
    }

    // Confirm before proceeding (unless dry-run)
    if (!isDryRun) {
      const confirmed = await promptConfirmation(
        `This will delete ${themes.size} document(s) from the themes collection. Continue? (y/n): `
      );
      if (!confirmed) {
        console.log('Rollback cancelled.');
        return;
      }
    }

    // Delete each document
    for (const doc of themes) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would delete document: ${doc.id}`);
        stats.documentsDeleted++;
      } else {
        try {
          await db.collection('themes').doc(doc.id).delete();
          stats.documentsDeleted++;
          console.log(`✓ Deleted document: ${doc.id}`);
        } catch (error) {
          console.error(`✗ Error deleting document ${doc.id}:`, error.message);
          stats.errors.push({ docId: doc.id, error: error.message });
        }
      }
    }

    console.log('\n=== Rollback Summary ===');
    console.log(`Documents deleted: ${stats.documentsDeleted}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((err, index) => {
        console.log(`${index + 1}. Document ${err.docId}: ${err.error}`);
      });
    }

    console.log('\n✓ Rollback completed!');
  } catch (error) {
    console.error('\n✗ Rollback failed:', error);
    process.exit(1);
  }
}

// Main migration function
async function migrate() {
  console.log('\n=== Migration Script: problemSpaces → themes ===\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Get all documents from problemSpaces collection
    console.log('Fetching all documents from problemSpaces collection...');
    const problemSpacesSnapshot = await db.collection('problemSpaces').get();
    const problemSpaces = problemSpacesSnapshot.docs;

    console.log(`Found ${problemSpaces.size} document(s) in problemSpaces collection\n`);

    if (problemSpaces.size === 0) {
      console.log('No documents found in problemSpaces collection. Nothing to migrate.');
      return;
    }

    // Check if themes collection already has documents
    const themesSnapshot = await db.collection('themes').get();
    if (themesSnapshot.size > 0 && !isDryRun) {
      console.log(`⚠️  WARNING: themes collection already contains ${themesSnapshot.size} document(s).`);
      const confirmed = await promptConfirmation(
        'Continuing will add/update documents. Continue? (y/n): '
      );
      if (!confirmed) {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Confirm before proceeding (unless dry-run)
    if (!isDryRun) {
      const confirmed = await promptConfirmation(
        `This will copy ${problemSpaces.size} document(s) from problemSpaces to themes. Continue? (y/n): `
      );
      if (!confirmed) {
        console.log('Migration cancelled.');
        return;
      }
    }

    // Copy each document
    for (const doc of problemSpaces) {
      stats.documentsProcessed++;
      await copyDocument(doc, isDryRun);
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Documents processed: ${stats.documentsProcessed}`);
    console.log(`Documents copied: ${stats.documentsCopied}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((err, index) => {
        console.log(`${index + 1}. Document ${err.docId}: ${err.error}`);
      });
    }

    console.log('\n✓ Migration completed!');
    console.log('\n⚠️  IMPORTANT: After verifying the migration, you should:');
    console.log('1. Update your Firestore security rules to use "themes" instead of "problemSpaces"');
    console.log('2. Deploy your updated application code');
    console.log('3. Once everything is verified, you can delete the old "problemSpaces" collection manually');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration or rollback
if (isRollback) {
  rollback(isDryRun)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} else {
  migrate()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

