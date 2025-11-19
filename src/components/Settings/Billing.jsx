import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, TrendingUp, Calendar, AlertCircle, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getSubscriptionByOrganization, 
  updateSubscription,
  getOrganizationMembers 
} from '@/lib/firestoreUtils';
import { 
  TIER_CONFIG, 
  TIERS, 
  getTierConfig 
} from '@/lib/pricingConstants';
import { 
  getSeatUsage, 
  calculateAdditionalSeatCost,
  isInTrialPeriod,
  getTrialDaysRemaining 
} from '@/lib/subscriptionUtils';
import { createCheckout, cancelSubscription, resumeSubscription } from '@/lib/paymentProvider';
import { canManageBilling } from '@/lib/permissions';

const Billing = () => {
  const { currentUser, userOrganization, userProfile, refreshUserProfile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [targetTier, setTargetTier] = useState(null);

  useEffect(() => {
    if (userOrganization) {
      loadBillingData();
    } else {
      setIsLoading(false);
    }
  }, [userOrganization]);

  const loadBillingData = async () => {
    if (!userOrganization) return;
    
    setIsLoading(true);
    try {
      // Load subscription
      const sub = await getSubscriptionByOrganization(userOrganization.id);
      setSubscription(sub);

      // Load organization members for seat counting
      const members = await getOrganizationMembers(userOrganization.id);
      setOrganizationMembers(members);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tier) => {
    if (!userOrganization || !currentUser) return;
    
    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Check if user can manage billing
      if (!canManageBilling(userProfile?.role)) {
        setError('You do not have permission to manage billing');
        setIsProcessing(false);
        return;
      }

      // Create checkout session
      const result = await createCheckout(userOrganization.id, tier);
      
      if (result.success && result.checkoutUrl) {
        // Redirect to checkout
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error || 'Failed to create checkout session. Please contact support.');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError(err.message || 'Failed to initiate upgrade');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !window.confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await cancelSubscription(subscription.id);
      if (result.success) {
        setSuccess('Subscription will be canceled at the end of the billing period');
        await loadBillingData();
        await refreshUserProfile();
      } else {
        setError(result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await resumeSubscription(subscription.id);
      if (result.success) {
        setSuccess('Subscription resumed successfully');
        await loadBillingData();
        await refreshUserProfile();
      } else {
        setError(result.error || 'Failed to resume subscription');
      }
    } catch (err) {
      console.error('Error resuming subscription:', err);
      setError(err.message || 'Failed to resume subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!userOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You need to be part of an organization to view billing information.</p>
      </div>
    );
  }

  const canManage = canManageBilling(userProfile?.role);
  const tierConfig = getTierConfig(userOrganization.tier);
  const seatUsage = getSeatUsage(userOrganization);
  const additionalSeatCost = calculateAdditionalSeatCost(userOrganization);
  const inTrial = isInTrialPeriod(userOrganization);
  const trialDaysRemaining = getTrialDaysRemaining(userOrganization);
  const currentPeriodEnd = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) 
    : null;
  const nextBillingDate = currentPeriodEnd || (inTrial && userOrganization.trialEndsAt 
    ? new Date(userOrganization.trialEndsAt) 
    : null);

  const availableTiers = Object.values(TIERS).filter(tier => tier !== userOrganization.tier);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your subscription and billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold text-lg flex items-center gap-2">
                {tierConfig.name} Plan
                {inTrial && (
                  <Badge variant="secondary">Trial ({trialDaysRemaining} days left)</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                ${tierConfig.price}/{userOrganization.tier === TIERS.ENTERPRISE ? 'month (base)' : 'month'}
                {additionalSeatCost > 0 && (
                  <span className="ml-2">+ ${additionalSeatCost}/month for additional seats</span>
                )}
              </div>
            </div>
            <Badge variant={
              userOrganization.subscriptionStatus === 'active' ? 'default' :
              userOrganization.subscriptionStatus === 'trialing' ? 'secondary' :
              userOrganization.subscriptionStatus === 'canceled' ? 'outline' :
              'secondary'
            }>
              {userOrganization.subscriptionStatus?.charAt(0).toUpperCase() + userOrganization.subscriptionStatus?.slice(1) || 'Active'}
            </Badge>
          </div>

          {nextBillingDate && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {inTrial ? 'Trial Ends' : 'Next Billing Date'}
                </div>
                <div className="font-medium">{nextBillingDate.toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Billing Cycle</div>
                <div className="font-medium">Monthly</div>
              </div>
            </div>
          )}

          {canManage && availableTiers.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {availableTiers.map((tier) => {
                const targetTierConfig = getTierConfig(tier);
                const isUpgrade = TIER_CONFIG[tier].price > tierConfig.price;
                return (
                  <Button
                    key={tier}
                    variant="outline"
                    onClick={() => handleUpgrade(tier)}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isUpgrade ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {isUpgrade ? 'Upgrade' : 'Downgrade'} to {targetTierConfig.name}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seat Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seat Usage
          </CardTitle>
          <CardDescription>Track your current seat usage against plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Researcher Seats */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Researcher Seats</div>
              <div className="text-sm text-muted-foreground">
                {seatUsage.researcherSeatsUsed} / {seatUsage.researcherSeatsIncluded === null ? 'Unlimited' : seatUsage.researcherSeatsIncluded}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ 
                  width: seatUsage.researcherSeatsIncluded === null 
                    ? '100%' 
                    : `${Math.min(100, (seatUsage.researcherSeatsUsed / seatUsage.researcherSeatsIncluded) * 100)}%` 
                }}
              />
            </div>
            {seatUsage.researcherSeatsUsed > seatUsage.researcherSeatsIncluded && (
              <p className="text-xs text-destructive mt-1">
                {seatUsage.researcherSeatsUsed - seatUsage.researcherSeatsIncluded} additional seat(s) at ${tierConfig.researcherSeatPrice}/month each
              </p>
            )}
          </div>

          {/* Contributor Seats */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Contributor Seats
              </div>
              <div className="text-sm text-muted-foreground">
                {seatUsage.contributorSeatsUsed} / {seatUsage.contributorSeatsUnlimited ? 'Unlimited' : 'Unlimited (billed per seat)'}
              </div>
            </div>
            {!seatUsage.contributorSeatsUnlimited && seatUsage.contributorSeatsUsed > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ${tierConfig.contributorSeatPrice}/month per contributor seat
              </p>
            )}
            {seatUsage.contributorSeatsUnlimited && (
              <p className="text-xs text-muted-foreground mt-1">
                Unlimited contributors included in your plan
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Billing History
            </CardTitle>
            <CardDescription>View past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription.paymentProviderSubscriptionId ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Billing history will be available once payment provider is fully integrated.
                </p>
                {/* Future: Fetch invoices from payment provider */}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No billing history available</p>
                <p className="text-xs mt-1">Billing history will appear here once payment provider is integrated</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel/Resume Subscription */}
      {canManage && subscription && (
        <Card className={subscription.cancelAtPeriodEnd ? "border-warning" : "border-destructive"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {subscription.cancelAtPeriodEnd ? 'Subscription Canceling' : 'Danger Zone'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription.cancelAtPeriodEnd ? (
                <>
                  <div>
                    <div className="font-medium mb-1">Subscription Scheduled for Cancellation</div>
                    <div className="text-sm text-muted-foreground">
                      Your subscription will be canceled on {nextBillingDate?.toLocaleDateString()}. You'll continue to have access until then.
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleResumeSubscription}
                    disabled={isProcessing}
                  >
                    Resume Subscription
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <div className="font-medium mb-1">Cancel Subscription</div>
                    <div className="text-sm text-muted-foreground">
                      Cancel your subscription. You'll continue to have access until the end of your billing period.
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                    disabled={isProcessing}
                  >
                    Cancel Subscription
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;
