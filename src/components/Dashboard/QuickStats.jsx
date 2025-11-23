import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, FolderOpen, Target, TrendingUp, Calendar } from 'lucide-react';

const QuickStats = ({ stats }) => {
  const {
    sessionsThisWeek = 0,
    sessionsThisMonth = 0,
    totalInsights = 0,
    activeProjects = 0,
    activeThemes = 0
  } = stats || {};

  const statCards = [
    {
      title: 'Sessions This Week',
      value: sessionsThisWeek,
      icon: Calendar,
      description: `${sessionsThisMonth} this month`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Total Insights',
      value: totalInsights,
      icon: Lightbulb,
      description: 'Across all sessions',
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Active Projects',
      value: activeProjects,
      icon: FolderOpen,
      description: 'Currently active',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Themes',
      value: activeThemes,
      icon: Target,
      description: 'Active themes',
      color: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuickStats;

