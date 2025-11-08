import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart, Tag } from 'lucide-react';

const RepositoryAnalytics = ({ nuggets, sessions, projects }) => {
  // Calculate insights over time
  const getInsightsOverTime = () => {
    const timeData = {};
    nuggets.forEach(nugget => {
      if (nugget.session_date) {
        const date = new Date(nugget.session_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        timeData[monthKey] = (timeData[monthKey] || 0) + 1;
      }
    });
    return Object.entries(timeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  };

  // Category distribution
  const getCategoryDistribution = () => {
    const categoryCounts = {};
    nuggets.forEach(nugget => {
      const category = nugget.category || 'general';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Project distribution
  const getProjectDistribution = () => {
    const projectCounts = {};
    nuggets.forEach(nugget => {
      const session = sessions.find(s => s.id === nugget.session_id);
      if (session?.projectId) {
        const project = projects.find(p => p.id === session.projectId);
        const projectName = project?.name || 'Unknown Project';
        projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
      } else {
        projectCounts['Unassigned'] = (projectCounts['Unassigned'] || 0) + 1;
      }
    });
    return Object.entries(projectCounts)
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Sentiment trends
  const getSentimentTrends = () => {
    const sentimentCounts = {
      positive: nuggets.filter(n => n.category === 'sentiment').length,
      pain_points: nuggets.filter(n => n.category === 'pain_point').length,
      features: nuggets.filter(n => n.category === 'feature').length,
      other: nuggets.filter(n => !['sentiment', 'pain_point', 'feature'].includes(n.category)).length
    };
    return sentimentCounts;
  };

  // Most common tags
  const getMostCommonTags = () => {
    const tagCounts = {};
    nuggets.forEach(nugget => {
      if (Array.isArray(nugget.tags)) {
        nugget.tags.forEach(tag => {
          const tagName = typeof tag === 'string' ? tag : String(tag);
          tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Top pain points
  const getTopPainPoints = () => {
    return nuggets
      .filter(n => n.category === 'pain_point')
      .slice(0, 5)
      .map(n => ({
        observation: n.observation,
        count: 1 // In a real app, you'd group by similar observations
      }));
  };

  // Participant segment breakdown
  const getParticipantSegmentBreakdown = () => {
    const segments = {};
    nuggets.forEach(nugget => {
      const session = sessions.find(s => s.id === nugget.session_id);
      if (session?.participantContext) {
        const { companySize, userType } = session.participantContext;
        const segmentKey = `${companySize || 'Unknown'}-${userType || 'Unknown'}`;
        segments[segmentKey] = (segments[segmentKey] || 0) + 1;
      } else {
        segments['No Context'] = (segments['No Context'] || 0) + 1;
      }
    });
    return Object.entries(segments)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const insightsOverTime = getInsightsOverTime();
  const categoryDistribution = getCategoryDistribution();
  const projectDistribution = getProjectDistribution();
  const sentimentTrends = getSentimentTrends();
  const commonTags = getMostCommonTags();
  const topPainPoints = getTopPainPoints();
  const segmentBreakdown = getParticipantSegmentBreakdown();

  const maxCategoryCount = Math.max(...categoryDistribution.map(c => c.count), 1);
  const maxProjectCount = Math.max(...projectDistribution.map(p => p.count), 1);
  const maxTagCount = Math.max(...commonTags.map(t => t.count), 1);
  const maxTimeCount = Math.max(...insightsOverTime.map(([, count]) => count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Insights Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Insights Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insightsOverTime.length > 0 ? (
              insightsOverTime.map(([month, count]) => (
                <div key={month} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-20">
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / maxTimeCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-8 text-right">{count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No time data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoryDistribution.map(({ category, count }) => (
              <div key={category} className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-24 capitalize">
                  {category.replace('_', ' ')}
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-medium w-8 text-right">{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Project Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projectDistribution.length > 0 ? (
              projectDistribution.map(({ project, count }) => (
                <div key={project} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground flex-1 truncate">
                    {project}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / maxProjectCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-8 text-right">{count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No project data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sentiment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {sentimentTrends.positive}
              </div>
              <div className="text-xs text-green-600 dark:text-green-300">Positive</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {sentimentTrends.pain_points}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-300">Pain Points</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {sentimentTrends.features}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300">Features</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                {sentimentTrends.other}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Other</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Common Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Most Common Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commonTags.length > 0 ? (
              commonTags.map(({ tag, count }) => (
                <div key={tag} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground flex-1">
                    {tag}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / maxTagCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-8 text-right">{count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tags available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participant Segment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Participant Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {segmentBreakdown.length > 0 ? (
              segmentBreakdown.map(({ segment, count }) => (
                <div key={segment} className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {segment.replace('-', ' • ')}
                  </div>
                  <div className="text-sm font-medium">{count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No segment data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepositoryAnalytics;

