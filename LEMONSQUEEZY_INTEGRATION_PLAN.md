# LemonSqueezy Payment Integration Plan

## Overview
This plan details the integration of LemonSqueezy as the payment provider for the Gist application. The integration builds upon the existing payment provider abstraction layer (`src/lib/paymentProvider.js`) and subscription management system implemented in Phases 1-2.

## Prerequisites

### Completed Foundation (Phases 1-2)
- ✅ Data model with organizations, workspaces, and subscriptions collections
- ✅ Payment provider abstraction layer (`src/lib/paymentProvider.js`)
- ✅ Subscription utilities (`src/lib/subscriptionUtils.js`)
- ✅ Pricing constants and tier configurations (`src/lib/pricingConstants.js`)
- ✅ Role-based permissions system
- ✅ Firestore security rules for subscriptions

### LemonSqueezy Account Setup Required
1. Create LemonSqueezy account (UK-based, no business registration needed)
2. Add UK bank account details
3. Create products for each tier:
   - Small Team ($49/month)
   - Team Plan ($149/month)
   - Enterprise Plan ($399/month)
4. Get API keys:
   - Store ID
   - API Key (for server-side operations)
   - Webhook Secret (for webhook verification)

## Phase 1: LemonSqueezy Account & Product Setup

### 1.1 Create LemonSqueezy Account
- Sign up at https://lemonsqueezy.com
- Complete account verification
- Add UK bank account for payouts
- Note: No business registration required for UK individuals

### 1.2 Create Products in LemonSqueezy Dashboard
Create three products corresponding to our tiers:

**Small Team Plan**
- Name: "Gist Small Team Plan"
- Price: $49/month (recurring)
- Billing interval: Monthly
- Note the Variant ID (will be used in code)

**Team Plan**
- Name: "Gist Team Plan"
- Price: $149/month (recurring)
- Billing interval: Monthly
- Note the Variant ID

**Enterprise Plan**
- Name: "Gist Enterprise Plan"
- Price: $399/month (recurring)
- Billing interval: Monthly
- Note the Variant ID

### 1.3 Get API Credentials
- Store ID: Found in LemonSqueezy dashboard
- API Key: Generate in API settings (keep secret!)
- Webhook Secret: Generate in webhook settings

### 1.4 Environment Variables
Add to `.env` file (and Firebase Functions config):
```
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_API_KEY=your_public_api_key
LEMONSQUEEZY_API_KEY=your_private_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

## Phase 2: Install Dependencies & Setup Firebase Functions

### 2.1 Install LemonSqueezy SDK
```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

### 2.2 Initialize Firebase Functions
```bash
firebase init functions
```

Select:
- JavaScript
- ESLint: Yes
- Install dependencies: Yes

### 2.3 Install Firebase Functions Dependencies
```bash
cd functions
npm install @lemonsqueezy/lemonsqueezy.js firebase-admin
cd ..
```

### 2.4 Configure Firebase Functions Environment
```bash
firebase functions:config:set lemonsqueezy.api_key="your_private_api_key"
firebase functions:config:set lemonsqueezy.webhook_secret="your_webhook_secret"
firebase functions:config:set lemonsqueezy.store_id="your_store_id"
```

## Phase 3: Create LemonSqueezy Client Utilities

### 3.1 Create Client-Side LemonSqueezy Utilities
**File: `src/lib/lemonsqueezyUtils.js`**

This file will contain:
- Helper functions to map tiers to LemonSqueezy variant IDs
- Client-side checkout URL generation (if needed)
- Utility functions for working with LemonSqueezy data

### 3.2 Create Variant ID Mapping
**File: `src/lib/lemonsqueezyConfig.js`**

Map tier names to LemonSqueezy variant IDs:
```javascript
export const LEMONSQUEEZY_VARIANTS = {
  small_team: 'variant_id_from_lemonsqueezy',
  team: 'variant_id_from_lemonsqueezy',
  enterprise: 'variant_id_from_lemonsqueezy'
};
```

## Phase 4: Update Payment Provider Abstraction Layer

### 4.1 Update `src/lib/paymentProvider.js`

Replace stub implementations with actual LemonSqueezy API calls:

**Functions to implement:**
1. `createCheckout()` - Generate LemonSqueezy checkout URL
2. `updateSubscription()` - Update subscription via LemonSqueezy API
3. `cancelSubscription()` - Cancel subscription via LemonSqueezy API
4. `resumeSubscription()` - Resume canceled subscription
5. `getSubscription()` - Fetch subscription details from LemonSqueezy

**Implementation Notes:**
- Use `@lemonsqueezy/lemonsqueezy.js` SDK
- Store LemonSqueezy subscription IDs in Firestore `subscriptions` collection
- Handle errors gracefully
- Update Firestore after successful LemonSqueezy operations

### 4.2 Integration Points

The following files already use `paymentProvider` and will automatically work:
- `src/components/Settings/Billing.jsx` - Subscription management UI
- `src/pages/UpgradePage.jsx` - Tier upgrade flow
- Any component calling `paymentProvider.createCheckout()`

## Phase 5: Firebase Cloud Functions for Webhooks

### 5.1 Create Webhook Handler
**File: `functions/src/index.js`**

Set up Express server to handle LemonSqueezy webhooks:
- Verify webhook signatures
- Route events to appropriate handlers
- Update Firestore based on webhook events

### 5.2 Webhook Event Handlers
**File: `functions/src/webhooks.js`**

Handle the following LemonSqueezy webhook events:

1. **`subscription_created`**
   - Create/update subscription in Firestore
   - Set organization tier
   - Update subscription status to 'active'
   - Store LemonSqueezy subscription ID and customer ID

2. **`subscription_updated`**
   - Update subscription tier if changed
   - Update subscription status
   - Update billing period dates
   - Handle seat changes

3. **`subscription_cancelled`**
   - Mark subscription as canceled
   - Set `cancelAtPeriodEnd: true`
   - Update organization subscription status

4. **`subscription_resumed`**
   - Reactivate subscription
   - Update subscription status to 'active'
   - Clear cancellation flags

5. **`subscription_payment_success`**
   - Update billing period dates
   - Update subscription status to 'active'
   - Clear any past_due flags

6. **`subscription_payment_failed`**
   - Mark subscription as past_due
   - Update subscription status
   - Send notification (optional)

### 5.3 Webhook Security
- Verify webhook signatures using `LEMONSQUEEZY_WEBHOOK_SECRET`
- Reject unsigned or invalid webhooks
- Log all webhook events for debugging

### 5.4 Deploy Webhook Endpoint
```bash
firebase deploy --only functions
```

Webhook URL will be:
```
https://[region]-[project-id].cloudfunctions.net/lemonsqueezyWebhook
```

Configure this URL in LemonSqueezy dashboard under Webhooks.

## Phase 6: Update Firestore Functions

### 6.1 Update Subscription CRUD Functions
**File: `src/lib/firestoreUtils.js`**

Ensure subscription functions properly handle:
- `paymentProvider` field (set to 'lemonsqueezy')
- `paymentProviderSubscriptionId` (LemonSqueezy subscription ID)
- `paymentProviderCustomerId` (LemonSqueezy customer ID)

### 6.2 Sync Functions
Create functions to sync LemonSqueezy data with Firestore:
- `syncSubscriptionFromLemonSqueezy()` - Fetch and update subscription
- `syncOrganizationTier()` - Update organization tier from subscription

## Phase 7: Update UI Components

### 7.1 Update Billing Component
**File: `src/components/Settings/Billing.jsx`**

- Connect "Upgrade" buttons to `paymentProvider.createCheckout()`
- Show real-time subscription status from Firestore
- Display LemonSqueezy subscription details
- Handle checkout success/failure redirects

### 7.2 Update Upgrade Page
**File: `src/pages/UpgradePage.jsx`**

- Connect tier selection to LemonSqueezy checkout
- Pass organization ID in checkout metadata
- Handle checkout completion
- Show loading states during checkout

### 7.3 Checkout Success Handler
**File: `src/pages/CheckoutSuccessPage.jsx`** (new)

- Handle redirect from LemonSqueezy after successful payment
- Verify checkout completion
- Update UI to show success message
- Redirect to billing page

## Phase 8: Testing

### 8.1 Test Scenarios

1. **Subscription Creation**
   - Create new subscription via checkout
   - Verify webhook received and processed
   - Verify Firestore updated correctly
   - Verify organization tier updated

2. **Subscription Upgrade**
   - Upgrade from Small Team to Team
   - Verify tier change in Firestore
   - Verify billing updated

3. **Subscription Downgrade**
   - Downgrade from Team to Small Team
   - Verify tier change
   - Verify workspace limits enforced

4. **Subscription Cancellation**
   - Cancel subscription
   - Verify cancelAtPeriodEnd set
   - Verify access continues until period end

5. **Subscription Resumption**
   - Resume canceled subscription
   - Verify reactivation
   - Verify billing resumed

6. **Payment Success**
   - Simulate successful payment
   - Verify billing period updated
   - Verify status remains active

7. **Payment Failure**
   - Simulate failed payment
   - Verify past_due status
   - Verify access restrictions (if implemented)

### 8.2 Test Mode
- Use LemonSqueezy test mode for development
- Test with test credit cards
- Verify webhooks in test environment

## Phase 9: Error Handling & Edge Cases

### 9.1 Error Scenarios
- Network failures during API calls
- Invalid webhook signatures
- Missing subscription data
- Duplicate webhook events
- Race conditions between webhooks and user actions

### 9.2 Retry Logic
- Implement retry logic for failed API calls
- Queue failed webhook processing
- Log errors for debugging

### 9.3 User Notifications
- Notify users of subscription changes
- Notify admins of payment failures
- Send email confirmations (via LemonSqueezy or custom)

## Phase 10: Documentation & Deployment

### 10.1 Update Documentation
- Update `ARCHITECTURE_NOTES.md` with LemonSqueezy integration details
- Create `LEMONSQUEEZY_SETUP.md` with setup instructions
- Document webhook event handling
- Document error handling procedures

### 10.2 Production Deployment Checklist
- [ ] LemonSqueezy account verified
- [ ] Products created in LemonSqueezy
- [ ] API keys configured in Firebase Functions
- [ ] Webhook endpoint deployed and configured
- [ ] Test all subscription flows
- [ ] Monitor webhook logs
- [ ] Set up error alerting
- [ ] Document rollback procedure

## Integration Points Reference

### Files That Use Payment Provider
- `src/lib/paymentProvider.js` - **Main integration point** (update this file)
- `src/components/Settings/Billing.jsx` - Uses `paymentProvider.createCheckout()`
- `src/pages/UpgradePage.jsx` - Uses `paymentProvider.createCheckout()`

### Firestore Collections
- `organizations` - Contains `subscriptionId`, `subscriptionStatus`, `tier`
- `subscriptions` - Contains `paymentProviderSubscriptionId`, `paymentProviderCustomerId`, `paymentProvider`

### Firebase Functions
- `functions/src/index.js` - Webhook endpoint
- `functions/src/webhooks.js` - Webhook event handlers

## Key Implementation Details

### Checkout Flow
1. User clicks "Upgrade" in UI
2. `paymentProvider.createCheckout()` called with organizationId and tier
3. LemonSqueezy checkout URL generated
4. User redirected to LemonSqueezy checkout
5. User completes payment
6. LemonSqueezy sends webhook to Firebase Function
7. Webhook handler updates Firestore
8. User redirected back to app
9. UI shows updated subscription status

### Subscription Update Flow
1. User requests subscription change (upgrade/downgrade)
2. `paymentProvider.updateSubscription()` called
3. LemonSqueezy API updates subscription
4. LemonSqueezy sends webhook
5. Webhook handler updates Firestore
6. UI reflects changes

### Webhook Processing Flow
1. LemonSqueezy sends webhook to Firebase Function
2. Function verifies webhook signature
3. Function routes to appropriate handler
4. Handler updates Firestore
5. Handler updates organization tier if needed
6. Handler logs event for audit

## Environment Variables Summary

**Client-side (.env):**
```
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_API_KEY=your_public_api_key
```

**Server-side (Firebase Functions config):**
```
lemonsqueezy.api_key=your_private_api_key
lemonsqueezy.webhook_secret=your_webhook_secret
lemonsqueezy.store_id=your_store_id
```

## Next Steps After Integration

1. Monitor webhook logs for errors
2. Set up error alerting
3. Test all subscription flows in production
4. Document any customizations
5. Plan for additional features (seat management, prorated billing, etc.)

## Support Resources

- LemonSqueezy API Documentation: https://docs.lemonsqueezy.com
- LemonSqueezy Webhooks: https://docs.lemonsqueezy.com/help/webhooks
- Firebase Functions: https://firebase.google.com/docs/functions

