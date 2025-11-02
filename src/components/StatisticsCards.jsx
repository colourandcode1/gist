import React from 'react';
import { Database, Video, TrendingUp, Check } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

/**
 * Component for displaying repository statistics
 */
const StatisticsCards = ({ totalNuggets, totalSessions, painPoints, positiveNuggets }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{totalNuggets}</div>
              <div className="text-sm text-muted-foreground">Total Insights</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{painPoints}</div>
              <div className="text-sm text-muted-foreground">Pain Points</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-bold text-foreground">{positiveNuggets}</div>
              <div className="text-sm text-muted-foreground">Positive</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsCards;

