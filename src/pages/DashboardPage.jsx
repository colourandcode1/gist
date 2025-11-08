import React, { useState, useEffect } from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import QuickStats from '@/components/Dashboard/QuickStats';
import QuickActions from '@/components/Dashboard/QuickActions';
import RecentActivity from '@/components/Dashboard/RecentActivity';
import { getSessions, getProjects, getProblemSpaces, getAllNuggets } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    sessionsThisWeek: 0,
    sessionsThisMonth: 0,
    totalInsights: 0,
    activeProjects: 0,
    activeProblemSpaces: 0
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentProblemSpaces, setRecentProblemSpaces] = useState([]);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [sessions, projects, problemSpaces, allNuggets] = await Promise.all([
        getSessions(currentUser.uid),
        getProjects(currentUser.uid),
        getProblemSpaces(currentUser.uid),
        getAllNuggets(currentUser.uid)
      ]);

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
      const activeProblemSpaces = problemSpaces.filter(ps => ps.privacy !== 'archived').length;

      setStats({
        sessionsThisWeek,
        sessionsThisMonth,
        totalInsights: allNuggets.length,
        activeProjects,
        activeProblemSpaces
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

      const sortedProblemSpaces = [...problemSpaces].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
      });

      setRecentSessions(sortedSessions.slice(0, 5));
      setRecentProjects(sortedProjects.slice(0, 5));
      setRecentProblemSpaces(sortedProblemSpaces.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your research activities</p>
        </div>

        {/* Quick Stats */}
        <div className="mb-6">
          <QuickStats stats={stats} />
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <RecentActivity
            recentSessions={recentSessions}
            recentProjects={recentProjects}
            recentProblemSpaces={recentProblemSpaces}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

