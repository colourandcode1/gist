import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const Billing = () => {
  const [billingInfo, setBillingInfo] = useState({
    plan: 'Professional',
    status: 'active',
    nextBillingDate: '2024-02-15',
    amount: 99.00,
    currency: 'USD'
  });

  const [usage, setUsage] = useState({
    sessions: { used: 45, limit: 100 },
    storage: { used: 12.5, limit: 50 }, // GB
    users: { used: 3, limit: 10 }
  });

  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: 'card', last4: '4242', expiry: '12/25', isDefault: true }
  ]);

  return (
    <div className="space-y-6">
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
              <div className="font-semibold text-lg">{billingInfo.plan} Plan</div>
              <div className="text-sm text-muted-foreground">
                ${billingInfo.amount.toFixed(2)}/{billingInfo.currency === 'USD' ? 'month' : 'mo'}
              </div>
            </div>
            <Badge variant={billingInfo.status === 'active' ? 'default' : 'secondary'}>
              {billingInfo.status.charAt(0).toUpperCase() + billingInfo.status.slice(1)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Next Billing Date</div>
              <div className="font-medium">{new Date(billingInfo.nextBillingDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Billing Cycle</div>
              <div className="font-medium">Monthly</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">Upgrade Plan</Button>
            <Button variant="outline">Change Plan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>Track your current usage against plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Sessions</div>
              <div className="text-sm text-muted-foreground">
                {usage.sessions.used} / {usage.sessions.limit}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(usage.sessions.used / usage.sessions.limit) * 100}%` }}
              />
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Storage</div>
              <div className="text-sm text-muted-foreground">
                {usage.storage.used} GB / {usage.storage.limit} GB
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(usage.storage.used / usage.storage.limit) * 100}%` }}
              />
            </div>
          </div>

          {/* Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Licenses
              </div>
              <div className="text-sm text-muted-foreground">
                {usage.users.used} / {usage.users.limit}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(usage.users.used / usage.users.limit) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    •••• •••• •••• {method.last4}
                  </div>
                  <div className="text-sm text-muted-foreground">Expires {method.expiry}</div>
                </div>
                {method.isDefault && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {!method.isDefault && (
                  <Button variant="outline" size="sm">Set as Default</Button>
                )}
                <Button variant="outline" size="sm">Remove</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full">
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Billing History
          </CardTitle>
          <CardDescription>View past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Invoice #{202400 + i}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(2024, 0, 15 - i * 30).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">${billingInfo.amount.toFixed(2)}</div>
                    <Badge variant="secondary" className="text-xs">Paid</Badge>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="font-medium mb-1">Cancel Subscription</div>
              <div className="text-sm text-muted-foreground">
                Cancel your subscription. You'll continue to have access until the end of your billing period.
              </div>
            </div>
            <Button variant="destructive">Cancel Subscription</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;

