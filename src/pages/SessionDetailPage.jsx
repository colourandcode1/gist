import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Trash2, Save, X, Search, Plus, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getSessionById, updateSession, deleteSession } from '@/lib/firestoreUtils';
import { getNuggetsBySessionId, deleteNugget } from '@/lib/firestoreUtils';
import { getProjectById, getProjects } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import NuggetCard from '@/components/NuggetCard';
import { CATEGORIES } from '@/lib/constants';

const SessionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [session, setSession] = useState(null);
  const [nuggets, setNuggets] = useState([]);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [editMode, setEditMode] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id && currentUser) {
      loadSessionData();
    }
  }, [id, currentUser]);

  const loadSessionData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const sessionData = await getSessionById(id);
      if (!sessionData) {
        navigate('/sessions');
        return;
      }

      // Check permissions
      if (sessionData.userId !== currentUser.uid) {
        navigate('/sessions');
        return;
      }

      setSession(sessionData);
      setEditedTranscript(sessionData.transcript_content || '');

      // Load nuggets
      const nuggetsData = await getNuggetsBySessionId(id, currentUser.uid);
      setNuggets(nuggetsData);

      // Load project if assigned
      if (sessionData.projectId) {
        const projectData = await getProjectById(sessionData.projectId);
        setProject(projectData);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!currentUser || !session) return;

    try {
      // TODO: Implement transcript versioning in Phase 3.4
      const result = await updateSession(id, { transcript_content: editedTranscript }, currentUser.uid);
      if (result.success) {
        setSession(prev => ({ ...prev, transcript_content: editedTranscript }));
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      alert('Failed to save transcript');
    }
  };

  const handleDeleteSession = async () => {
    if (!currentUser || !session) return;

    const confirmed = window.confirm('Are you sure you want to delete this session? This will also delete all insights.');
    if (!confirmed) return;

    const result = await deleteSession(id, currentUser.uid);
    if (result.success) {
      navigate('/sessions');
    } else {
      alert(`Failed to delete session: ${result.error}`);
    }
  };

  const handleDeleteNugget = async (nuggetId) => {
    if (!currentUser) return;

    const confirmed = window.confirm('Are you sure you want to delete this insight?');
    if (!confirmed) return;

    const result = await deleteNugget(id, nuggetId, currentUser.uid);
    if (result.success) {
      loadSessionData();
    } else {
      alert(`Failed to delete insight: ${result.error}`);
    }
  };

  const filteredNuggets = nuggets.filter(nugget => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      nugget.observation?.toLowerCase().includes(query) ||
      nugget.evidence_text?.toLowerCase().includes(query) ||
      nugget.category?.toLowerCase().includes(query) ||
      nugget.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Calculate analytics
  const categoryBreakdown = nuggets.reduce((acc, nugget) => {
    acc[nugget.category] = (acc[nugget.category] || 0) + 1;
    return acc;
  }, {});

  const sentimentDistribution = {
    positive: nuggets.filter(n => n.category === 'sentiment').length,
    negative: nuggets.filter(n => n.category === 'pain_point').length,
    neutral: nuggets.filter(n => !['sentiment', 'pain_point'].includes(n.category)).length
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (project) {
    breadcrumbItems.push({ label: 'Projects', path: '/projects' });
    breadcrumbItems.push({ label: project.name, path: `/projects/${project.id}` });
  }
  breadcrumbItems.push({ label: 'Sessions', path: '/sessions' });
  breadcrumbItems.push({ label: session.title });

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />
        
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{session.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{session.session_date || new Date(session.createdAt).toLocaleDateString()}</span>
              <Badge variant="outline">{session.session_type?.replace('_', ' ')}</Badge>
              {project && (
                <Badge variant="secondary">{project.name}</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export Session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteSession} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Participant Context */}
        {session.participantContext && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Participant Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {session.participantContext.companyName && (
                  <div>
                    <span className="text-muted-foreground">Company: </span>
                    <span className="text-foreground">{session.participantContext.companyName}</span>
                  </div>
                )}
                {session.participantContext.companySize && (
                  <div>
                    <span className="text-muted-foreground">Size: </span>
                    <span className="text-foreground">{session.participantContext.companySize}</span>
                  </div>
                )}
                {session.participantContext.userRole && (
                  <div>
                    <span className="text-muted-foreground">Role: </span>
                    <span className="text-foreground">{session.participantContext.userRole}</span>
                  </div>
                )}
                {session.participantContext.industry && (
                  <div>
                    <span className="text-muted-foreground">Industry: </span>
                    <span className="text-foreground">{session.participantContext.industry}</span>
                  </div>
                )}
                {session.participantContext.productTenure && (
                  <div>
                    <span className="text-muted-foreground">Tenure: </span>
                    <span className="text-foreground">{session.participantContext.productTenure}</span>
                  </div>
                )}
                {session.participantContext.userType && (
                  <div>
                    <span className="text-muted-foreground">User Type: </span>
                    <span className="text-foreground">{session.participantContext.userType}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="insights">Insights ({nuggets.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript">
            <SessionTranscriptTab
              session={session}
              transcript={session.transcript_content || ''}
              editedTranscript={editedTranscript}
              setEditedTranscript={setEditedTranscript}
              editMode={editMode}
              setEditMode={setEditMode}
              onSave={handleSaveTranscript}
            />
          </TabsContent>

          <TabsContent value="insights">
            <SessionInsightsTab
              nuggets={filteredNuggets}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onDeleteNugget={handleDeleteNugget}
              session={session}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <SessionAnalyticsTab
              categoryBreakdown={categoryBreakdown}
              sentimentDistribution={sentimentDistribution}
              nuggets={nuggets}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Transcript Tab Component
const SessionTranscriptTab = ({ session, transcript, editedTranscript, setEditedTranscript, editMode, setEditMode, onSave }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transcript</CardTitle>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditedTranscript(transcript);
                  setEditMode(false);
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={onSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Transcript
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editMode ? (
          <Textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="min-h-[500px] font-mono text-sm"
            placeholder="Enter transcript content..."
          />
        ) : (
          <div className="whitespace-pre-line text-sm leading-relaxed text-foreground bg-muted p-4 rounded-md">
            {transcript || 'No transcript content available'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Insights Tab Component
const SessionInsightsTab = ({ nuggets, searchQuery, setSearchQuery, onDeleteNugget, session }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insights</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search insights..."
              className="w-64 pl-10"
            />
          </div>
        </div>
      </div>

      {nuggets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No insights created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nuggets.map((nugget) => (
            <div key={nugget.id} className="relative">
              <NuggetCard
                nugget={nugget}
                tags={[]}
                sessionData={session}
                showVideoPlayer={false}
                setCurrentVideoTimestamp={() => {}}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => onDeleteNugget(nugget.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Analytics Tab Component
const SessionAnalyticsTab = ({ categoryBreakdown, sentimentDistribution, nuggets }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nuggets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Positive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sentimentDistribution.positive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pain Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{sentimentDistribution.negative}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown).map(([category, count]) => {
              const categoryInfo = CATEGORIES.find(c => c.id === category);
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{categoryInfo?.name || category}</Badge>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionDetailPage;
