import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Lock, Sparkles } from 'lucide-react';
import { TIER_CONFIG, TIERS } from '@/lib/pricingConstants';

const UpgradePrompt = ({ 
  feature, 
  requiredTier, 
  currentTier,
  description,
  showInCard = true 
}) => {
  const navigate = useNavigate();
  const tierConfig = TIER_CONFIG[requiredTier];
  const currentTierConfig = TIER_CONFIG[currentTier] || TIER_CONFIG[TIERS.SMALL_TEAM];

  const handleUpgrade = () => {
    navigate('/settings?tab=billing');
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{feature} is not available</h3>
            <Badge variant="secondary">{tierConfig.name} Plan Required</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {description || `This feature is available on the ${tierConfig.name} plan and above.`}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Plan:</span>
              <span className="font-medium">{currentTierConfig.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Required Plan:</span>
              <span className="font-medium">{tierConfig.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Upgrade Cost:</span>
              <span>${tierConfig.price}/month</span>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade} 
            className="w-full mt-4 flex items-center gap-2"
          >
            <ArrowUp className="w-4 h-4" />
            Upgrade to {tierConfig.name}
          </Button>
        </div>
      </div>
    </div>
  );

  if (showInCard) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Upgrade Required
          </CardTitle>
          <CardDescription>
            Unlock this feature by upgrading your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default UpgradePrompt;

