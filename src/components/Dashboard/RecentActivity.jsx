import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, Target, Clock, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const RecentActivity = ({ recentSessions, recentProjects, recentProblemSpaces }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const displayItems = (items, type) => {
    if (!items || items.length === 0) return null;

    const getIcon = () => {
      switch (type) {
        case 'session':
          return FileText;
        case 'project':
          return FolderOpen;
        case 'problemSpace':
          return Target;
        default:
          return Clock;
      }
    };

    const getRoute = (item) => {
      switch (type) {
        case 'session':
          return `/sessions/${item.id}`;
        case 'project':
          return `/projects/${item.id}`;
        case 'problemSpace':
          return `/problem-spaces/${item.id}`;
        default:
          return '#';
      }
    };

    const Icon = getIcon();

    return items.slice(0, 5).map((item) => (
      <div
        key={item.id}
        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
        onClick={() => navigate(getRoute(item))}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {item.name || item.title || 'Untitled'}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(item.updatedAt || item.createdAt || item.session_date)}
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    ));
  };

  const hasRecentActivity = 
    (recentSessions && recentSessions.length > 0) ||
    (recentProjects && recentProjects.length > 0) ||
    (recentProblemSpaces && recentProblemSpaces.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="space-y-1">
              {displayItems(recentSessions, 'session')}
              {recentSessions.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => navigate('/sessions')}
                >
                  View All Sessions
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent sessions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="w-5 h-5" />
            Recent Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-1">
              {displayItems(recentProjects, 'project')}
              {recentProjects.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => navigate('/projects')}
                >
                  View All Projects
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent projects</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Problem Spaces */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5" />
            Recent Problem Spaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentProblemSpaces && recentProblemSpaces.length > 0 ? (
            <div className="space-y-1">
              {displayItems(recentProblemSpaces, 'problemSpace')}
              {recentProblemSpaces.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => navigate('/problem-spaces')}
                >
                  View All Problem Spaces
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent problem spaces</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentActivity;

