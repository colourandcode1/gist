import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Archive, Download, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ProjectHeader } from '@/components/Project/ProjectHeader';
import { ProjectOverviewTab } from '@/components/Project/ProjectOverviewTab';
import { ProjectSessionsTab } from '@/components/Project/ProjectSessionsTab';
import { ProjectInsightsTab } from '@/components/Project/ProjectInsightsTab';
import { ProjectThemesTab } from '@/components/Project/ProjectThemesTab';
import { ProjectSettingsTab } from '@/components/Project/ProjectSettingsTab';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/contexts/AuthContext';
import { canUploadSessions, canCreateProjects } from '@/lib/permissions';
import ProjectForm from '@/components/ProjectForm';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    project,
    sessions,
    nuggets,
    themes,
    isLoading,
    loadProjectData,
    handleArchive,
    handleDelete
  } = useProject(id, currentUser);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  if (isEditing) {
    return (
      <ProjectForm
        project={project}
        onSave={() => {
          setIsEditing(false);
          loadProjectData();
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Projects', path: '/projects' },
            { label: project.name }
          ]}
        />
        
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <ProjectHeader
            project={project}
            userProfile={userProfile}
            onNewSession={() => navigate(`/?projectId=${id}`)}
            onEdit={() => setIsEditing(true)}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
          {canCreateProjects(userProfile?.role) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="insights">Insights ({nuggets.length})</TabsTrigger>
            <TabsTrigger value="themes">Themes ({themes.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab project={project} sessions={sessions} nuggets={nuggets} />
          </TabsContent>

          <TabsContent value="sessions">
            <ProjectSessionsTab projectId={id} sessions={sessions} onRefresh={loadProjectData} />
          </TabsContent>

          <TabsContent value="insights">
            <ProjectInsightsTab nuggets={nuggets} projectId={id} />
          </TabsContent>

          <TabsContent value="themes">
            <ProjectThemesTab themes={themes} nuggets={nuggets} />
          </TabsContent>

          <TabsContent value="settings">
            <ProjectSettingsTab 
              project={project} 
              onUpdate={loadProjectData}
              onDelete={handleDelete}
              currentUser={currentUser}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
