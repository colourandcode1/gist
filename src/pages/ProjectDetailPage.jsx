import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Archive, Download, MoreVertical, Plus, User, PenTool } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getProjectById, updateProject, deleteProject } from '@/lib/firestoreUtils';
import { getSessionsByProject, getAllNuggets } from '@/lib/firestoreUtils';
import { getProblemSpaces } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import ProjectForm from '@/components/ProjectForm';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [project, setProject] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [nuggets, setNuggets] = useState([]);
  const [problemSpaces, setProblemSpaces] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id && currentUser) {
      loadProjectData();
    }
  }, [id, currentUser]);

  const loadProjectData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const projectData = await getProjectById(id);
      if (!projectData) {
        navigate('/projects');
        return;
      }

      setProject(projectData);

      // Load related data
      const [sessionsData, nuggetsData, allProblemSpaces] = await Promise.all([
        getSessionsByProject(id, currentUser.uid),
        getAllNuggets(currentUser.uid, null, id),
        getProblemSpaces(currentUser.uid)
      ]);

      setSessions(sessionsData);
      setNuggets(nuggetsData);

      // Filter problem spaces that use insights from this project
      const relevantProblemSpaces = allProblemSpaces.filter(ps => {
        // Check if any insight IDs match nuggets from this project
        const projectInsightIds = nuggetsData.map(n => `${n.session_id}:${n.id}`);
        return ps.insightIds?.some(insightId => projectInsightIds.includes(insightId));
      });

      setProblemSpaces(relevantProblemSpaces);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!currentUser || !project) return;

    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    const result = await updateProject(project.id, { status: newStatus }, currentUser.uid);
    if (result.success) {
      loadProjectData();
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !project) return;

    const confirmed = window.confirm('Are you sure you want to delete this project? Sessions and insights will not be deleted, but they will be unassigned from the project.');
    if (!confirmed) return;

    const result = await deleteProject(project.id, currentUser.uid);
    if (result.success) {
      navigate('/projects');
    }
  };

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
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{project.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2">
            {canUploadSessions(userProfile?.role) && (
              <Button 
                onClick={() => navigate(`/?projectId=${id}`)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Session
              </Button>
            )}
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
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="insights">Insights ({nuggets.length})</TabsTrigger>
            <TabsTrigger value="problem-spaces">Problem Spaces ({problemSpaces.length})</TabsTrigger>
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

          <TabsContent value="problem-spaces">
            <ProjectProblemSpacesTab problemSpaces={problemSpaces} nuggets={nuggets} />
          </TabsContent>

          <TabsContent value="settings">
            <ProjectSettingsTab project={project} onUpdate={loadProjectData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Overview Tab Component
const ProjectOverviewTab = ({ project, sessions, nuggets }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nuggets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="text-foreground mt-1">{project.description || 'No description provided'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <p className="text-foreground mt-1">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">End Date</label>
              <p className="text-foreground mt-1">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </p>
            </div>
          </div>
          {project.researchGoals && project.researchGoals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Research Goals</label>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {project.researchGoals.map((goal, index) => (
                  <li key={index} className="text-foreground">{goal}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Sessions Tab Component
const ProjectSessionsTab = ({ projectId, sessions, onRefresh }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sessions in this Project</h3>
        {canUploadSessions(userProfile?.role) && (
          <Button onClick={() => navigate(`/?projectId=${projectId}`)}>
            Create New Session
          </Button>
        )}
      </div>
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No sessions in this project yet</p>
            {canUploadSessions(userProfile?.role) && (
              <Button onClick={() => navigate(`/?projectId=${projectId}`)}>
                Create First Session
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sessions/${session.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{session.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {session.session_date} • {session.session_type}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {session.nuggets?.length || 0} insights
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Insights Tab Component
const ProjectInsightsTab = ({ nuggets, projectId }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insights from Project Sessions</h3>
      </div>
      {nuggets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No insights created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nuggets.map((nugget) => (
            <Card key={nugget.id}>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2">{nugget.observation}</h4>
                <p className="text-sm text-muted-foreground italic mb-2">"{nugget.evidence_text}"</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline">{nugget.category}</Badge>
                  <span className="text-xs text-muted-foreground">{nugget.session_title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {nugget.speaker && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Speaker: {nugget.speaker}</span>
                    </div>
                  )}
                  {nugget.createdByName && (
                    <div className="flex items-center gap-1">
                      <PenTool className="w-3 h-3" />
                      <span>Created by {nugget.createdByName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Problem Spaces Tab Component
const ProjectProblemSpacesTab = ({ problemSpaces, nuggets }) => {
  const navigate = useNavigate();

  const getInsightCount = (problemSpace) => {
    const projectInsightIds = nuggets.map(n => `${n.session_id}:${n.id}`);
    return problemSpace.insightIds?.filter(id => projectInsightIds.includes(id)).length || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Problem Spaces Using Project Insights</h3>
      </div>
      {problemSpaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No problem spaces are using insights from this project</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {problemSpaces.map((ps) => (
            <Card key={ps.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/problem-spaces/${ps.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{ps.name}</h4>
                    <p className="text-sm text-muted-foreground">{ps.description || 'No description'}</p>
                  </div>
                  <Badge variant="outline">
                    {getInsightCount(ps)} insights from this project
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Tab Component
const ProjectSettingsTab = ({ project, onUpdate }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleStatusChange = async (newStatus) => {
    if (!currentUser) return;
    const result = await updateProject(project.id, { status: newStatus }, currentUser.uid);
    if (result.success) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">Change the project status</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={project.status === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('active')}
              >
                Active
              </Button>
              <Button
                variant={project.status === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('completed')}
              >
                Completed
              </Button>
              <Button
                variant={project.status === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('archived')}
              >
                Archived
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                This will unassign all sessions from the project. Sessions and insights will not be deleted.
              </p>
            </div>
            <Button variant="destructive" onClick={() => {
              const confirmed = window.confirm('Are you sure you want to delete this project?');
              if (confirmed) {
                // Handle delete - this will be implemented in the parent component
              }
            }}>
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetailPage;
