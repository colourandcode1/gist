import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Users, Lock, Globe, MoreVertical, Eye, Copy, Settings, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavigationHeader from '@/components/NavigationHeader';
import { getProblemSpaces } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import ProblemSpaceForm from '@/components/ProblemSpaceForm';
import { canCreateProblemSpaces } from '@/lib/permissions';
import UpgradePrompt from '@/components/UpgradePrompt';

const ProblemSpacesPage = () => {
  const { currentUser, userProfile, userOrganization } = useAuth();
  const navigate = useNavigate();
  const [problemSpaces, setProblemSpaces] = useState([]);
  const [filteredSpaces, setFilteredSpaces] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  const [filter, setFilter] = useState('all'); // 'all', 'my', 'team', 'recent'
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);

  useEffect(() => {
    loadProblemSpaces();
  }, [currentUser, filter]);

  const loadProblemSpaces = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const spaces = await getProblemSpaces(currentUser.uid);
      
      // Apply filters
      let filtered = spaces;
      if (filter === 'my') {
        filtered = spaces.filter(ps => ps.userId === currentUser.uid && ps.privacy === 'private');
      } else if (filter === 'team') {
        filtered = spaces.filter(ps => ps.privacy === 'team' || (ps.teamId !== null && ps.contributors?.includes(currentUser.uid)));
      } else if (filter === 'recent') {
        // Sort by updatedAt and take most recent
        filtered = [...spaces].sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB - dateA;
        }).slice(0, 10);
      }

      setProblemSpaces(spaces);
      setFilteredSpaces(filtered);
    } catch (error) {
      console.error('Error loading problem spaces:', error);
      setProblemSpaces([]);
      setFilteredSpaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSpace = () => {
    setEditingSpace(null);
    setShowForm(true);
  };

  const handleDuplicate = async (space) => {
    if (!currentUser) return;
    
    const duplicatedSpace = {
      name: `${space.name} (Copy)`,
      description: space.description,
      privacy: space.privacy,
      teamId: space.teamId,
      contributors: [currentUser.uid],
      outputType: space.outputType,
      problemStatement: space.problemStatement,
      keyQuestions: space.keyQuestions || [],
      linkedProjects: [],
      insightIds: []
    };

    const { createProblemSpace } = await import('@/lib/firestoreUtils');
    const result = await createProblemSpace(duplicatedSpace, currentUser.uid);
    if (result.success) {
      loadProblemSpaces();
    } else {
      alert(`Failed to duplicate problem space: ${result.error}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
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

  const getOutputTypeIcon = (outputType) => {
    // Return appropriate icon based on output type
    return '📄';
  };

  if (showForm) {
    return (
      <ProblemSpaceForm
        problemSpace={editingSpace}
        onSave={() => {
          setShowForm(false);
          setEditingSpace(null);
          loadProblemSpaces();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingSpace(null);
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Problem Spaces</h1>
            <p className="text-muted-foreground">Organize and analyze insights across your research</p>
          </div>
          {canCreateProblemSpaces(userProfile?.role) ? (
            <Button onClick={handleCreateSpace} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Problem Space
            </Button>
          ) : (
            <UpgradePrompt
              feature="Problem Space Creation"
              requiredTier="starter"
              currentTier={userOrganization?.tier || 'small_team'}
              description="Only Members can create problem spaces."
              showInCard={false}
            />
          )}
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'my' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('my')}
            >
              My Problem Spaces
            </Button>
            <Button
              variant={filter === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('team')}
            >
              Team Problem Spaces
            </Button>
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('recent')}
            >
              Recently Updated
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
              <p className="text-muted-foreground">Loading problem spaces...</p>
            </div>
          </div>
        ) : filteredSpaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LayoutGrid className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No problem spaces yet</h3>
              <p className="text-muted-foreground mb-4">Create your first problem space to organize insights</p>
              <Button onClick={handleCreateSpace} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Problem Space
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredSpaces.map((space) => (
              <Card key={space.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/problem-spaces/${space.id}`)}
                        >
                          {space.name}
                        </h3>
                        <Badge variant={space.privacy === 'private' ? 'outline' : 'secondary'}>
                          {space.privacy === 'private' ? (
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
                        {space.outputType && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getOutputTypeIcon(space.outputType)}
                            {space.outputType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {space.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {space.contributors?.length || 0} {space.contributors?.length === 1 ? 'contributor' : 'contributors'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{space.insightIds?.length || 0}</span>
                          <span>{(space.insightIds?.length || 0) === 1 ? 'insight' : 'insights'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Updated {formatDate(space.updatedAt || space.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {space.contributors && space.contributors.length > 0 && (
                        <div className="flex -space-x-2">
                          {space.contributors.slice(0, 3).map((contributorId, idx) => (
                            <Avatar key={idx} className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {contributorId.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {space.contributors.length > 3 && (
                            <Avatar className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                +{space.contributors.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/problem-spaces/${space.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(space)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/problem-spaces/${space.id}?tab=settings`)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Share Settings
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
            {filteredSpaces.map((space) => (
              <Card key={space.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/problem-spaces/${space.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{space.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/problem-spaces/${space.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(space); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/problem-spaces/${space.id}?tab=settings`); }}>
                          <Settings className="w-4 h-4 mr-2" />
                          Share Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={space.privacy === 'private' ? 'outline' : 'secondary'}>
                      {space.privacy === 'private' ? (
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
                    {space.outputType && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getOutputTypeIcon(space.outputType)}
                        {space.outputType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {space.description || 'No description'}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">{space.insightIds?.length || 0}</span>
                      <span>{(space.insightIds?.length || 0) === 1 ? 'insight' : 'insights'}</span>
                    </div>
                    {space.contributors && space.contributors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {space.contributors.slice(0, 3).map((contributorId, idx) => (
                            <Avatar key={idx} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {contributorId.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {space.contributors.length > 3 && (
                            <Avatar className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                +{space.contributors.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {space.contributors.length} {space.contributors.length === 1 ? 'contributor' : 'contributors'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Updated {formatDate(space.updatedAt || space.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemSpacesPage;
