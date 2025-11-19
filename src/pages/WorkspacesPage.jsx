import React from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import WorkspaceManagement from '@/components/WorkspaceManagement';
import { useAuth } from '@/contexts/AuthContext';

const WorkspacesPage = () => {
  const { userOrganization, isAdmin } = useAuth();

  if (!userOrganization) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">You need to be part of an organization to manage workspaces.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Only administrators can manage workspaces.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <WorkspaceManagement />
      </div>
    </div>
  );
};

export default WorkspacesPage;

