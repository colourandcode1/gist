import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationHeader from '@/components/NavigationHeader';
import QuickStats from '@/components/Dashboard/QuickStats';
import QuickActions from '@/components/Dashboard/QuickActions';
import RecentActivity from '@/components/Dashboard/RecentActivity';
import ActivityChart from '@/components/Dashboard/ActivityChart';
import { getSessions, getProjects, getThemes, getAllNuggets } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DashboardPage = () => {
  const { currentUser, userOrganization, userWorkspaces } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [stats, setStats] = useState({
    sessionsThisWeek: 0,
    sessionsThisMonth: 0,
    totalInsights: 0,
    activeProjects: 0,
    activeThemes: 0
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentThemes, setRecentThemes] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [allNuggets, setAllNuggets] = useState([]);

  // Get selected workspace from localStorage or default to first workspace
  useEffect(() => {
    if (userWorkspaces && userWorkspaces.length > 0) {
      const stored = localStorage.getItem('selectedWorkspaceId');
      const workspaceId = stored && userWorkspaces.find(w => w.id === stored)
        ? stored
        : userWorkspaces[0].id;
      setSelectedWorkspaceId(workspaceId);
    } else {
      setSelectedWorkspaceId(null);
    }
  }, [userWorkspaces]);

  useEffect(() => {
    // Load data for all authenticated users
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, selectedWorkspaceId, userOrganization]);

  const loadDashboardData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get workspaceIds for organization filtering
      const workspaceIds = userWorkspaces?.map(w => w.id) || [];
      const workspaceIdsToQuery = selectedWorkspaceId 
        ? [selectedWorkspaceId] 
        : workspaceIds;

      // Fetch all data in parallel with organization filtering
      let [sessions, projects, themes, nuggets] = await Promise.all([
        getSessions(currentUser.uid, null, true, workspaceIdsToQuery.length > 0 ? workspaceIdsToQuery : null),
        getProjects(currentUser.uid, null, workspaceIdsToQuery.length > 0 ? workspaceIdsToQuery : null),
        getThemes(currentUser.uid, null, workspaceIdsToQuery.length > 0 ? workspaceIdsToQuery : null),
        getAllNuggets(currentUser.uid)
      ]);

      // Additional filter by workspace if one is selected (for client-side filtering)
      if (selectedWorkspaceId) {
        sessions = sessions.filter(s => s.workspaceId === selectedWorkspaceId);
        projects = projects.filter(p => p.workspaceId === selectedWorkspaceId);
        themes = themes.filter(t => t.workspaceId === selectedWorkspaceId);
        // Filter nuggets by sessions in the workspace
        const workspaceSessionIds = new Set(sessions.map(s => s.id));
        nuggets = nuggets.filter(n => workspaceSessionIds.has(n.session_id));
      }

      // Calculate stats
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const sessionsThisWeek = sessions.filter(session => {
        const sessionDate = new Date(session.session_date || session.createdAt);
        return sessionDate >= oneWeekAgo;
      }).length;

      const sessionsThisMonth = sessions.filter(session => {
        const sessionDate = new Date(session.session_date || session.createdAt);
        return sessionDate >= oneMonthAgo;
      }).length;

      const activeProjects = projects.filter(project => project.status === 'active').length;
      const activeThemes = themes.filter(t => t.privacy !== 'archived').length;

      setStats({
        sessionsThisWeek,
        sessionsThisMonth,
        totalInsights: nuggets.length,
        activeProjects,
        activeThemes
      });

      // Get recent items (sorted by updatedAt or createdAt, most recent first)
      const sortedSessions = [...sessions].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || a.session_date || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || b.session_date || 0);
        return dateB - dateA;
      });

      const sortedProjects = [...projects].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });

      const sortedThemes = [...themes].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });

      setRecentSessions(sortedSessions.slice(0, 5));
      setRecentProjects(sortedProjects.slice(0, 5));
      setRecentThemes(sortedThemes.slice(0, 5));
      setAllSessions(sessions);
      setAllNuggets(nuggets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Dashboard is available to all authenticated users

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your research activities
              {selectedWorkspaceId && userWorkspaces?.length > 0 && (
                <span className="ml-2">
                  <Badge variant="secondary" className="ml-2">
                    <Building2 className="w-3 h-3 mr-1 inline" />
                    {userWorkspaces.find(w => w.id === selectedWorkspaceId)?.name || 'Workspace'}
                  </Badge>
                </span>
              )}
            </p>
          </div>
          {userWorkspaces && userWorkspaces.length > 1 && (
            <select
              value={selectedWorkspaceId || ''}
              onChange={(e) => {
                const workspaceId = e.target.value || null;
                setSelectedWorkspaceId(workspaceId);
                if (workspaceId) {
                  localStorage.setItem('selectedWorkspaceId', workspaceId);
                } else {
                  localStorage.removeItem('selectedWorkspaceId');
                }
              }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Workspaces</option>
              {userWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mb-6">
          <QuickStats stats={stats} />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Activity Chart */}
        <div className="mb-6">
          <ActivityChart sessions={allSessions} nuggets={allNuggets} />
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <RecentActivity
            recentSessions={recentSessions}
            recentProjects={recentProjects}
            recentThemes={recentThemes}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

