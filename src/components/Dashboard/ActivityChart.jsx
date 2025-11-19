import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';

const ActivityChart = ({ sessions, nuggets }) => {
  // Calculate activity for last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    return days;
  };

  const getActivityData = () => {
    const days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const sessionsCount = sessions.filter(s => {
        const sessionDate = new Date(s.session_date || s.createdAt);
        return sessionDate >= date && sessionDate < nextDay;
      }).length;
      
      const nuggetsCount = nuggets.filter(n => {
        const nuggetDate = new Date(n.created_at || n.createdAt || 0);
        return nuggetDate >= date && nuggetDate < nextDay;
      }).length;
      
      days.push({ date: date.toLocaleDateString('en-US', { weekday: 'short' }), sessions: sessionsCount, nuggets: nuggetsCount });
    }
    
    return days;
  };

  const activityData = getActivityData();
  const maxValue = Math.max(
    ...activityData.map(d => Math.max(d.sessions, d.nuggets)),
    1
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Activity Over Last 7 Days
        </CardTitle>
        <CardDescription>Daily sessions and insights created</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2 h-48">
            {activityData.map((day, index) => {
              const sessionsHeight = (day.sessions / maxValue) * 100;
              const nuggetsHeight = (day.nuggets / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${sessionsHeight}%`, minHeight: day.sessions > 0 ? '4px' : '0' }}
                      title={`${day.sessions} sessions`}
                    />
                    <div
                      className="w-full bg-yellow-500 rounded-t transition-all hover:bg-yellow-600"
                      style={{ height: `${nuggetsHeight}%`, minHeight: day.nuggets > 0 ? '4px' : '0' }}
                      title={`${day.nuggets} insights`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {day.date}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm text-muted-foreground">Insights</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityChart;

