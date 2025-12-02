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
import { getThemes } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import ThemeForm from '@/components/ThemeForm';
import { canCreateThemes } from '@/lib/permissions';
import UpgradePrompt from '@/components/UpgradePrompt';

const ThemesPage = () => {
  const { currentUser, userProfile, userOrganization, userWorkspaces } = useAuth();
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [filteredThemes, setFilteredThemes] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  const [filter, setFilter] = useState('all'); // 'all', 'my', 'team', 'recent'
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);

  useEffect(() => {
    loadThemes();
  }, [currentUser, filter]);

  const loadThemes = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get workspaceIds for organization filtering
      const workspaceIds = userWorkspaces?.map(w => w.id) || [];
      
      const spaces = await getThemes(currentUser.uid, null, workspaceIds.length > 0 ? workspaceIds : null);
      
      // Apply filters
      let filtered = spaces;
      if (filter === 'my') {
        filtered = spaces.filter(t => t.userId === currentUser.uid && t.privacy === 'private');
      } else if (filter === 'team') {
        filtered = spaces.filter(t => t.privacy === 'team' || (t.teamId !== null && t.contributors?.includes(currentUser.uid)));
      } else if (filter === 'recent') {
        // Sort by updatedAt and take most recent
        filtered = [...spaces].sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0);
          const dateB = new Date(b.updatedAt || b.createdAt || 0);
          return dateB - dateA;
        }).slice(0, 10);
      }

      setThemes(spaces);
      setFilteredThemes(filtered);
    } catch (error) {
      console.error('Error loading themes:', error);
      setThemes([]);
      setFilteredThemes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTheme = () => {
    setEditingTheme(null);
    setShowForm(true);
  };

  const handleDuplicate = async (theme) => {
    if (!currentUser) return;
    
    const duplicatedTheme = {
      name: `${theme.name} (Copy)`,
      description: theme.description,
      privacy: theme.privacy,
      teamId: theme.teamId,
      contributors: [currentUser.uid],
      outputType: theme.outputType,
      problemStatement: theme.problemStatement,
      keyQuestions: theme.keyQuestions || [],
      linkedProjects: [],
      insightIds: []
    };

    const { createTheme } = await import('@/lib/firestoreUtils');
    const result = await createTheme(duplicatedTheme, currentUser.uid);
    if (result.success) {
      loadThemes();
    } else {
      alert(`Failed to duplicate theme: ${result.error}`);
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
      <ThemeForm
        theme={editingTheme}
        onSave={() => {
          setShowForm(false);
          setEditingTheme(null);
          loadThemes();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingTheme(null);
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Themes</h1>
            <p className="text-muted-foreground">Organize and analyze insights across your research</p>
          </div>
          {canCreateThemes(userProfile?.role) ? (
            <Button onClick={handleCreateTheme} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Theme
            </Button>
          ) : (
            <UpgradePrompt
              feature="Theme Creation"
              requiredTier="starter"
              currentTier={userOrganization?.tier || 'small_team'}
              description="Only Members can create themes."
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
              My Themes
            </Button>
            <Button
              variant={filter === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('team')}
            >
              Team Themes
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
              <p className="text-muted-foreground">Loading themes...</p>
            </div>
          </div>
        ) : filteredThemes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LayoutGrid className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No themes yet</h3>
              <p className="text-muted-foreground mb-4">Create your first theme to organize insights</p>
              <Button onClick={handleCreateTheme} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Theme
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredThemes.map((theme) => (
              <Card key={theme.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/themes/${theme.id}`)}
                        >
                          {theme.name}
                        </h3>
                        <Badge variant={theme.privacy === 'private' ? 'outline' : 'secondary'}>
                          {theme.privacy === 'private' ? (
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
                        {theme.outputType && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getOutputTypeIcon(theme.outputType)}
                            {theme.outputType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {theme.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {theme.contributors?.length || 0} {theme.contributors?.length === 1 ? 'contributor' : 'contributors'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{theme.insightIds?.length || 0}</span>
                          <span>{(theme.insightIds?.length || 0) === 1 ? 'insight' : 'insights'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Updated {formatDate(theme.updatedAt || theme.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {theme.contributors && theme.contributors.length > 0 && (
                        <div className="flex -space-x-2">
                          {theme.contributors.slice(0, 3).map((contributorId, idx) => (
                            <Avatar key={idx} className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {contributorId.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {theme.contributors.length > 3 && (
                            <Avatar className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                +{theme.contributors.length - 3}
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
                          <DropdownMenuItem onClick={() => navigate(`/themes/${theme.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(theme)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/themes/${theme.id}?tab=settings`)}>
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
            {filteredThemes.map((theme) => (
              <Card key={theme.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/themes/${theme.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{theme.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/themes/${theme.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(theme); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/themes/${theme.id}?tab=settings`); }}>
                          <Settings className="w-4 h-4 mr-2" />
                          Share Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={theme.privacy === 'private' ? 'outline' : 'secondary'}>
                      {theme.privacy === 'private' ? (
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
                    {theme.outputType && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getOutputTypeIcon(theme.outputType)}
                        {theme.outputType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {theme.description || 'No description'}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">{theme.insightIds?.length || 0}</span>
                      <span>{(theme.insightIds?.length || 0) === 1 ? 'insight' : 'insights'}</span>
                    </div>
                    {theme.contributors && theme.contributors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {theme.contributors.slice(0, 3).map((contributorId, idx) => (
                            <Avatar key={idx} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {contributorId.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {theme.contributors.length > 3 && (
                            <Avatar className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                +{theme.contributors.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {theme.contributors.length} {theme.contributors.length === 1 ? 'contributor' : 'contributors'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Updated {formatDate(theme.updatedAt || theme.createdAt)}
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

export default ThemesPage;

