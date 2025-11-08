import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit, Target, FolderOpen, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getActivities, getUserProfile } from '@/lib/firestoreUtils';

const ActivityFeed = ({ problemSpaceId }) => {
  const [activities, setActivities] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (problemSpaceId) {
      loadActivities();
    }
  }, [problemSpaceId]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const activitiesData = await getActivities(problemSpaceId);
      setActivities(activitiesData);

      // Load user profiles for all activity authors
      const userIds = [...new Set(activitiesData.map(a => a.userId))];
      const profiles = {};
      for (const userId of userIds) {
        const profile = await getUserProfile(userId);
        if (profile) {
          profiles[userId] = profile;
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserDisplayName = (userId) => {
    const profile = userProfiles[userId];
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return userId.substring(0, 8);
  };

  const getUserInitials = (userId) => {
    const profile = userProfiles[userId];
    if (profile?.email) {
      const parts = profile.email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return profile.email.substring(0, 2).toUpperCase();
    }
    return userId.substring(0, 2).toUpperCase();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'insight_added':
        return <Plus className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'problem_space_updated':
        return <Edit className="w-4 h-4" />;
      case 'project_changed':
        return <FolderOpen className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'insight_added':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'comment':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'problem_space_updated':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'project_changed':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Loading activities...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No activities yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {getUserInitials(activity.userId)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`p-1.5 rounded-full ${getActivityColor(activity.type)}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <span className="font-medium text-sm">
                    {getUserDisplayName(activity.userId)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {activity.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{activity.description}</p>
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {activity.metadata.insightCount && (
                      <span>{activity.metadata.insightCount} insights</span>
                    )}
                    {activity.metadata.projectName && (
                      <span>Project: {activity.metadata.projectName}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActivityFeed;

