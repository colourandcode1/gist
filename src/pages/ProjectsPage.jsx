import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Calendar, Users, MoreVertical, Archive, Edit, Eye, LayoutGrid, List } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationHeader from '@/components/NavigationHeader';
import { getProjects, getProjectsByStatus, deleteProject, updateProject } from '@/lib/firestoreUtils';
import { getSessionsByProject, getAllNuggets } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import ProjectForm from '@/components/ProjectForm';
import { canCreateProjects, canEditNuggets } from '@/lib/permissions';
import UpgradePrompt from '@/components/UpgradePrompt';

const ProjectsPage = () => {
  const { currentUser, userProfile, userOrganization, userWorkspaces } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed, archived
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  const [isLoading, setIsLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [currentUser, statusFilter]);

  const loadProjects = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get workspaceIds for organization filtering
      const workspaceIds = userWorkspaces?.map(w => w.id) || [];
      
      let loadedProjects;
      if (statusFilter === 'all') {
        loadedProjects = await getProjects(currentUser.uid, null, workspaceIds.length > 0 ? workspaceIds : null);
      } else {
        loadedProjects = await getProjectsByStatus(currentUser.uid, statusFilter, null, workspaceIds.length > 0 ? workspaceIds : null);
      }

      // Enrich projects with session and insight counts
      // Use Promise.allSettled to prevent one project's enrichment failure from blocking others
      const enrichmentResults = await Promise.allSettled(
        loadedProjects.map(async (project) => {
          try {
            const sessions = await getSessionsByProject(project.id, currentUser.uid).catch(() => []);
            const nuggets = await getAllNuggets(currentUser.uid, null, project.id).catch(() => []);
            return {
              ...project,
              sessionCount: sessions.length,
              insightCount: nuggets.length
            };
          } catch (error) {
            // Return project with zero counts if enrichment fails
            return {
              ...project,
              sessionCount: 0,
              insightCount: 0
            };
          }
        })
      );

      // Extract successful enrichments, fallback to original project if enrichment failed
      const enrichedProjects = enrichmentResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            ...loadedProjects[index],
            sessionCount: 0,
            insightCount: 0
          };
        }
      });

      setProjects(enrichedProjects);
      setFilteredProjects(enrichedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectForm(true);
  };

  const handleProjectSaved = async () => {
    setShowProjectForm(false);
    setEditingProject(null);
    // Add a small delay to ensure Firestore has indexed the new document
    await new Promise(resolve => setTimeout(resolve, 500));
    await loadProjects();
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!currentUser) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this project? This will not delete the sessions or insights, but they will be unassigned from the project.');
    if (!confirmed) return;

    const result = await deleteProject(projectId, currentUser.uid);
    if (result.success) {
      loadProjects();
    } else {
      alert(`Failed to delete project: ${result.error}`);
    }
  };

  const handleArchiveProject = async (project) => {
    if (!currentUser) return;

    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    const result = await updateProject(project.id, { status: newStatus }, currentUser.uid);
    if (result.success) {
      loadProjects();
    } else {
      alert(`Failed to update project: ${result.error}`);
    }
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return 'No dates set';
    if (!endDate) return `Started ${new Date(startDate).toLocaleDateString()}`;
    if (!startDate) return `Ends ${new Date(endDate).toLocaleDateString()}`;
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' },
      completed: { label: 'Completed', variant: 'secondary' },
      archived: { label: 'Archived', variant: 'outline' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (showProjectForm) {
    return (
      <ProjectForm
        project={editingProject}
        onSave={handleProjectSaved}
        onCancel={() => {
          setShowProjectForm(false);
          setEditingProject(null);
        }}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">Organize your research sessions and insights</p>
          </div>
          {canCreateProjects(userProfile?.role) ? (
            <Button onClick={handleCreateProject} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          ) : (
            <UpgradePrompt
              feature="Project Creation"
              requiredTier="starter"
              currentTier={userOrganization?.tier || 'small_team'}
              description="Only Members can create projects. Upgrade your role or plan to access this feature."
              showInCard={false}
            />
          )}
        </div>

        {/* Status Filter and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('archived')}
            >
              Archived
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'board' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Board
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to organize your research</p>
              <Button onClick={handleCreateProject} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {project.name}
                        </h3>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDateRange(project.startDate, project.endDate)}
                        </div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {project.sessionCount} {project.sessionCount === 1 ? 'session' : 'sessions'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {project.insightCount} {project.insightCount === 1 ? 'insight' : 'insights'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditProject(project)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchiveProject(project)}>
                            <Archive className="w-4 h-4 mr-2" />
                            {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchiveProject(project)}>
                          <Archive className="w-4 h-4 mr-2" />
                          {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description || 'No description'}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(project.startDate, project.endDate)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderOpen className="w-4 h-4" />
                      {project.sessionCount} {project.sessionCount === 1 ? 'session' : 'sessions'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {project.insightCount} {project.insightCount === 1 ? 'insight' : 'insights'}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
