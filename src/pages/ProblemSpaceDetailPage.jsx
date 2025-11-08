import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Save, X, Share2, Download, Copy, Trash2, 
  Users, Lock, Globe, Plus, MessageSquare, Settings as SettingsIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProblemSpaceInsightManager from '@/components/ProblemSpaceInsightManager';
import CommentsThread from '@/components/Comments/CommentsThread';
import ShareDialog from '@/components/Sharing/ShareDialog';
import ExportDialog from '@/components/Export/ExportDialog';
import ActivityFeed from '@/components/ActivityFeed';
import { 
  getProblemSpaceById, 
  updateProblemSpace, 
  updateProblemSpacePrivacy,
  deleteProblemSpace,
  createActivity
} from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/lib/firestoreUtils';

const ProblemSpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [problemSpace, setProblemSpace] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [projects, setProjects] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (id && currentUser) {
      loadProblemSpace();
      loadProjects();
    }
  }, [id, currentUser]);

  const loadProblemSpace = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const space = await getProblemSpaceById(id);
      if (!space) {
        navigate('/problem-spaces');
        return;
      }

      setProblemSpace(space);
      setEditData({
        name: space.name || '',
        description: space.description || '',
        problemStatement: space.problemStatement || '',
        keyQuestions: space.keyQuestions || []
      });
    } catch (error) {
      console.error('Error loading problem space:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!currentUser) return;
    try {
      const allProjects = await getProjects(currentUser.uid);
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !problemSpace) return;

    setIsSaving(true);
    try {
      const result = await updateProblemSpace(problemSpace.id, editData, currentUser.uid);
      if (result.success) {
        // Track activity
        await createActivity(
          {
            type: 'problem_space_updated',
            problemSpaceId: problemSpace.id,
            description: `${currentUser.email?.split('@')[0] || 'User'} updated the problem space`,
            metadata: {
              updatedFields: Object.keys(editData)
            }
          },
          currentUser.uid
        );

        await loadProblemSpace();
        setIsEditing(false);
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyChange = async (privacy) => {
    if (!currentUser || !problemSpace) return;

    try {
      const result = await updateProblemSpacePrivacy(
        problemSpace.id, 
        privacy, 
        problemSpace.teamId, 
        currentUser.uid
      );
      if (result.success) {
        await loadProblemSpace();
      } else {
        alert(`Failed to update privacy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Failed to update privacy settings');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !problemSpace) return;

    if (!window.confirm('Are you sure you want to delete this problem space? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteProblemSpace(problemSpace.id, currentUser.uid);
      if (result.success) {
        navigate('/problem-spaces');
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete problem space');
    }
  };

  const handleDuplicate = async () => {
    if (!currentUser || !problemSpace) return;

    const duplicatedSpace = {
      name: `${problemSpace.name} (Copy)`,
      description: problemSpace.description,
      privacy: problemSpace.privacy,
      teamId: problemSpace.teamId,
      contributors: [currentUser.uid],
      outputType: problemSpace.outputType,
      problemStatement: problemSpace.problemStatement,
      keyQuestions: problemSpace.keyQuestions || [],
      linkedProjects: [],
      insightIds: []
    };

    const { createProblemSpace } = await import('@/lib/firestoreUtils');
    const result = await createProblemSpace(duplicatedSpace, currentUser.uid);
    if (result.success) {
      navigate(`/problem-spaces/${result.id}`);
    } else {
      alert(`Failed to duplicate: ${result.error}`);
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setEditData({
        ...editData,
        keyQuestions: [...(editData.keyQuestions || []), newQuestion.trim()]
      });
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (index) => {
    setEditData({
      ...editData,
      keyQuestions: editData.keyQuestions.filter((_, i) => i !== index)
    });
  };

  const canEdit = problemSpace && (
    problemSpace.userId === currentUser?.uid || 
    problemSpace.contributors?.includes(currentUser?.uid)
  );

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading problem space...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!problemSpace) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-muted-foreground">Problem space not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Problem Spaces', path: '/problem-spaces' },
            { label: problemSpace.name }
          ]}
        />
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="text-2xl font-bold"
                  />
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{problemSpace.name}</h1>
                  <p className="text-muted-foreground">{problemSpace.description || 'No description'}</p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-4">
                <Badge variant={problemSpace.privacy === 'private' ? 'outline' : 'secondary'}>
                  {problemSpace.privacy === 'private' ? (
                    <>
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3 mr-1" />
                      Team
                    </>
                  )}
                </Badge>
                {problemSpace.outputType && (
                  <Badge variant="outline">{problemSpace.outputType}</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {problemSpace.insightIds?.length || 0} insights
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: problemSpace.name || '',
                      description: problemSpace.description || '',
                      problemStatement: problemSpace.problemStatement || '',
                      keyQuestions: problemSpace.keyQuestions || []
                    });
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  {canEdit && problemSpace.userId === currentUser?.uid && (
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Problem Statement */}
              <Card>
                <CardHeader>
                  <CardTitle>Problem Statement</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.problemStatement}
                      onChange={(e) => setEditData({ ...editData, problemStatement: e.target.value })}
                      placeholder="Describe the problem or opportunity..."
                      rows={6}
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">
                      {problemSpace.problemStatement || 'No problem statement defined'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Key Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Questions / Hypotheses</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      {(editData.keyQuestions || []).map((question, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex-1 justify-start">
                            {question}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddQuestion();
                            }
                          }}
                          placeholder="Add a key question..."
                        />
                        <Button variant="outline" onClick={handleAddQuestion}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {problemSpace.keyQuestions && problemSpace.keyQuestions.length > 0 ? (
                        problemSpace.keyQuestions.map((question, index) => (
                          <Badge key={index} variant="secondary" className="mr-2">
                            {question}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No key questions defined</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Linked Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {problemSpace.linkedProjects && problemSpace.linkedProjects.length > 0 ? (
                    <div className="space-y-2">
                      {problemSpace.linkedProjects.map((projectId) => {
                        const project = projects.find(p => p.id === projectId);
                        return project ? (
                          <Button
                            key={projectId}
                            variant="outline"
                            onClick={() => navigate(`/projects/${projectId}`)}
                          >
                            {project.name}
                          </Button>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No linked projects</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{problemSpace.insightIds?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Total Insights</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{problemSpace.contributors?.length || 1}</div>
                    <p className="text-sm text-muted-foreground">Contributors</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {problemSpace.linkedProjects?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Linked Projects</p>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityFeed problemSpaceId={problemSpace.id} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-6">
            <ProblemSpaceInsightManager 
              problemSpace={problemSpace} 
              onUpdate={loadProblemSpace}
            />
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <CommentsThread problemSpaceId={problemSpace.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Sharing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Privacy</p>
                      <p className="text-sm text-muted-foreground">
                        {problemSpace.privacy === 'private' 
                          ? 'Only you can view and edit this problem space'
                          : 'Team members can view and contribute'}
                      </p>
                    </div>
                    {canEdit && problemSpace.userId === currentUser?.uid && (
                      <Switch
                        checked={problemSpace.privacy === 'team'}
                        onCheckedChange={(checked) => handlePrivacyChange(checked ? 'team' : 'private')}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Output Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Output type: {problemSpace.outputType || 'Not set'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  {problemSpace.contributors && problemSpace.contributors.length > 0 ? (
                    <div className="flex -space-x-2">
                      {problemSpace.contributors.map((contributorId, idx) => (
                        <Avatar key={idx} className="w-10 h-10 border-2 border-background">
                          <AvatarFallback>
                            {contributorId.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No contributors</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          problemSpaceId={problemSpace.id}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          problemSpaceId={problemSpace.id}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

export default ProblemSpaceDetailPage;
