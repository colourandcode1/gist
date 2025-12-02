const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Validates subdomain format
 * @param {string} subdomain - Subdomain to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateSubdomain(subdomain) {
  if (!subdomain) {
    return { valid: false, error: 'Subdomain is required' };
  }
  
  const normalized = subdomain.toLowerCase().trim();
  
  if (normalized.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }
  
  if (normalized.length > 50) {
    return { valid: false, error: 'Subdomain must be 50 characters or less' };
  }
  
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    return { valid: false, error: 'Subdomain cannot start or end with a hyphen' };
  }
  
  return { valid: true };
}

/**
 * Cloud Function to check subdomain availability
 * Can be called without authentication for signup flow
 * 
 * @param {Object} data - Request data containing subdomain
 * @param {string} data.subdomain - Subdomain to check
 * @returns {Promise<{available: boolean, error?: string}>}
 */
exports.checkSubdomainAvailability = functions.https.onCall(async (data, context) => {
  try {
    // Get subdomain from request
    const { subdomain } = data;
    
    // If subdomain is empty/null, it's optional so return available
    if (!subdomain || subdomain.trim() === '') {
      return { available: true };
    }
    
    // Normalize subdomain
    const normalized = subdomain.toLowerCase().trim();
    
    // Validate subdomain format
    const validation = validateSubdomain(normalized);
    if (!validation.valid) {
      return { 
        available: false, 
        error: validation.error 
      };
    }
    
    // Check if subdomain exists in Firestore using Admin SDK
    // Admin SDK bypasses security rules
    const db = admin.firestore();
    const organizationsRef = db.collection('organizations');
    const snapshot = await organizationsRef
      .where('subdomain', '==', normalized)
      .limit(1)
      .get();
    
    // If no documents found, subdomain is available
    const available = snapshot.empty;
    
    return { 
      available,
      ...(available ? {} : { error: 'This subdomain is already taken' })
    };
    
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    
    // Return error in a way that frontend can handle
    return {
      available: false,
      error: 'Error checking subdomain availability. Please try again.'
    };
  }
});

