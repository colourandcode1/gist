import React, { useState, useEffect } from 'react';
import { Search, Database, Video, TrendingUp, Check, Plus, Calendar, User, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NavigationHeader from './NavigationHeader';
import TranscriptModal from './TranscriptModal';
import { getSessions, getAllNuggets, deleteNugget } from '@/lib/storageUtils';

const RepositorySearchView = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSessions, setSavedSessions] = useState([]);
  const [allNuggets, setAllNuggets] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  
  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNugget, setSelectedNugget] = useState(null);
  const [selectedSessionData, setSelectedSessionData] = useState(null);

  // no inline edit state

  // Categories and tags data (matching the structure from TranscriptAnalysisView)
  const categories = [
    { id: 'pain_point', name: 'Pain Point', color: '#ef4444', description: 'Issues or problems users encounter' },
    { id: 'sentiment', name: 'Positive Feedback', color: '#10b981', description: 'Positive user feedback or satisfaction' },
    { id: 'feature', name: 'Feature Request', color: '#3b82f6', description: 'User suggestions for new features' },
    { id: 'journey', name: 'User Journey', color: '#f59e0b', description: 'Insights about user flow or process' },
    { id: 'usability', name: 'Usability', color: '#8b5cf6', description: 'Interface or design issues' },
    { id: 'performance', name: 'Performance', color: '#06b6d4', description: 'Speed or technical performance issues' },
    { id: 'general', name: 'General', color: '#6b7280', description: 'General insights or observations' }
  ];

  const tags = [
    { id: 1, name: 'Navigation', color: '#3b82f6' },
    { id: 2, name: 'Checkout', color: '#10b981' },
    { id: 3, name: 'Mobile', color: '#f59e0b' },
    { id: 4, name: 'Search', color: '#8b5cf6' },
    { id: 5, name: 'Onboarding', color: '#06b6d4' },
    { id: 6, name: 'Pricing', color: '#ef4444' }
  ];

  // Function to refresh data from localStorage
  const refreshData = () => {
    const sessions = getSessions();
    setSavedSessions(sessions);
    
    const nuggets = getAllNuggets();
    setAllNuggets(nuggets);
  };

  // Load saved sessions from localStorage on component mount
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh data when component becomes visible (when navigating back from analysis)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Filter management functions
  const addFilter = (type, id, name, color) => {
    const filterExists = activeFilters.some(filter => filter.type === type && filter.id === id);
    if (!filterExists) {
      setActiveFilters(prev => [...prev, { type, id, name, color }]);
    }
  };

  const removeFilter = (type, id) => {
    setActiveFilters(prev => prev.filter(filter => !(filter.type === type && filter.id === id)));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  // Helper functions for filter counts and clearing
  const getCategoryFilterCount = () => {
    return activeFilters.filter(f => f.type === 'category').length;
  };

  const getTagFilterCount = () => {
    return activeFilters.filter(f => f.type === 'tag').length;
  };

  const clearCategoryFilters = () => {
    setActiveFilters(prev => prev.filter(f => f.type !== 'category'));
  };

  const clearTagFilters = () => {
    setActiveFilters(prev => prev.filter(f => f.type !== 'tag'));
  };

  const handleEditInAnalysis = () => {
    if (!selectedNugget || !selectedSessionData) return;
    // Navigate to analysis view with prefill context
    onNavigate({
      view: 'analysis',
      session: {
        title: selectedSessionData.title,
        sessionDate: selectedSessionData.session_date,
        participantName: selectedSessionData.participant_info?.name || '',
        recordingUrl: selectedSessionData.recording_url || '',
        transcriptContent: selectedSessionData.transcript_content || '',
        sessionType: selectedSessionData.session_type || 'user_interview'
      },
      prefill: {
        nuggetId: selectedNugget.id,
        sessionId: selectedNugget.session_id,
        observation: selectedNugget.observation || '',
        selectedText: selectedNugget.evidence_text || '',
        timestamp: selectedNugget.timestamp || '',
        category: selectedNugget.category || 'general',
        tags: selectedNugget.tags || []
      }
    });
  };

  // Function to handle nugget click and open modal
  const handleNuggetClick = (nugget) => {
    // Find the session data for this nugget
    const sessionData = savedSessions.find(session => session.id === nugget.session_id);
    
    if (sessionData) {
      setSelectedNugget(nugget);
      setSelectedSessionData(sessionData);
      setIsModalOpen(true);
    } else {
      console.error('Session data not found for nugget:', nugget);
    }
  };

  // Function to close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNugget(null);
    setSelectedSessionData(null);
  };

  // Function to handle nugget deletion
  const handleDeleteNugget = () => {
    if (!selectedNugget) return;

    const confirmed = window.confirm('Are you sure you want to delete this insight?');
    if (!confirmed) return;

    const success = deleteNugget(selectedNugget.session_id, selectedNugget.id);
    
    if (success) {
      // Refresh data to update the UI
      refreshData();
      // Close the modal after deletion
      handleCloseModal();
    } else {
      console.error('Failed to delete nugget');
      alert('Failed to delete insight. Please try again.');
    }
  };

  const filteredNuggets = allNuggets.filter(nugget => {
    try {
      // Text search filter with proper data validation
      const matchesSearch = searchQuery === '' || 
        (nugget.observation && typeof nugget.observation === 'string' && nugget.observation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (nugget.evidence_text && typeof nugget.evidence_text === 'string' && nugget.evidence_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (nugget.session_title && typeof nugget.session_title === 'string' && nugget.session_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (nugget.tags && Array.isArray(nugget.tags) && nugget.tags.some(tag => 
          tag && typeof tag === 'string' && tag.toLowerCase().includes(searchQuery.toLowerCase())
        ));

      // Category and tag filters
      const activeCategoryFilters = activeFilters.filter(f => f.type === 'category');
      const activeTagFilters = activeFilters.filter(f => f.type === 'tag');
      
      const matchesCategories = activeCategoryFilters.length === 0 || 
        activeCategoryFilters.some(filter => nugget.category === filter.id);
      
      const matchesTags = activeTagFilters.length === 0 || 
        (nugget.tags && Array.isArray(nugget.tags) && activeTagFilters.some(filter => nugget.tags.includes(filter.id)));

      return matchesSearch && matchesCategories && matchesTags;
    } catch (error) {
      console.error('Error filtering nugget:', error, nugget);
      return false; // Exclude problematic nuggets
    }
  });

  const getSentimentColor = (category) => {
    switch (category) {
      case 'sentiment': return 'bg-green-100 text-green-800 border-green-200';
      case 'pain_point': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'usability': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'journey': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'performance': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calculate statistics from actual data
  const totalNuggets = allNuggets.length;
  const totalSessions = savedSessions.length;
  const painPoints = allNuggets.filter(nugget => nugget.category === 'pain_point').length;
  const positiveNuggets = allNuggets.filter(nugget => nugget.category === 'sentiment').length;

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader currentView="repository" onNavigate={onNavigate} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Research Repository</h1>
            <p className="text-muted-foreground">Search and discover insights from all your research sessions</p>
          </div>
          <Button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Session
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights, evidence, sessions, or tags..."
                className="w-full pl-10 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags Filter - Full Width */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">
                Tags {getTagFilterCount() > 0 && `(${getTagFilterCount()})`}
              </h3>
              {getTagFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTagFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear All
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => addFilter('tag', tag.id, tag.name, tag.color)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    activeFilters.some(f => f.type === 'tag' && f.id === tag.id)
                      ? 'font-medium'
                      : 'hover:bg-muted'
                  }`}
                  style={activeFilters.some(f => f.type === 'tag' && f.id === tag.id) ? {
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    border: `1px solid ${tag.color}30`
                  } : {
                    backgroundColor: 'transparent',
                    color: 'var(--muted-foreground)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalNuggets}</div>
                  <div className="text-sm text-muted-foreground">Total Insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalSessions}</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{painPoints}</div>
                  <div className="text-sm text-muted-foreground">Pain Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{positiveNuggets}</div>
                  <div className="text-sm text-muted-foreground">Positive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">
                    Categories {getCategoryFilterCount() > 0 && `(${getCategoryFilterCount()})`}
                  </h3>
                  {getCategoryFilterCount() > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCategoryFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => addFilter('category', category.id, category.name, category.color)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors ${
                        activeFilters.some(f => f.type === 'category' && f.id === category.id)
                          ? 'font-medium'
                          : 'hover:bg-muted'
                      }`}
                      style={activeFilters.some(f => f.type === 'category' && f.id === category.id) ? {
                        backgroundColor: `${category.color}15`,
                        color: category.color,
                        border: `1px solid ${category.color}30`
                      } : {
                        backgroundColor: 'transparent',
                        color: 'var(--muted-foreground)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nuggets Content */}
          <div className="lg:col-span-3 space-y-4 bg-background">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {filteredNuggets.length} insights found
              </h2>
            </div>

            {filteredNuggets.map(nugget => (
            <Card 
              key={nugget.id} 
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => handleNuggetClick(nugget)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-foreground mb-2">{nugget.observation}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {nugget.session_date}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {nugget.speaker}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {nugget.timestamp}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className={getSentimentColor(nugget.category)}>
                      {nugget.category.replace('_', ' ')}
                    </Badge>
                    {nugget.session_id && (
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        Watch
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted border-l-4 border-primary p-4 mb-4">
                  <p className="text-muted-foreground italic">"{nugget.evidence_text}"</p>
                </div>

                {/* inline edit removed */}

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {nugget.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    from {nugget.session_title}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredNuggets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground bg-background">
              <p className="text-sm">
                {allNuggets.length === 0 ? 'No insights yet' : 'No insights match your search'}
              </p>
              {allNuggets.length === 0 && (
                <Button
                  onClick={() => onNavigate('upload')}
                  className="mt-3 flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Create First Session
                </Button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* Transcript Modal */}
      <TranscriptModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        nugget={selectedNugget}
        sessionData={selectedSessionData}
        onEditInAnalysis={handleEditInAnalysis}
        onDelete={handleDeleteNugget}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default RepositorySearchView;
