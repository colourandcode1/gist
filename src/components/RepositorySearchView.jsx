import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import NavigationHeader from './NavigationHeader';
import TranscriptModal from './TranscriptModal';
import VideoModal from './VideoModal';
import RepositoryNuggetCard from './RepositoryNuggetCard';
import StatisticsCards from './StatisticsCards';
import TagFilters from './TagFilters';
import CategoryFilters from './CategoryFilters';
import { createTimestampedUrl } from '@/lib/videoUtils';
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
  
  // Video modal state management
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoNugget, setVideoNugget] = useState(null);
  const [videoSessionData, setVideoSessionData] = useState(null);

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

  // Function to handle watch button click and open video modal
  const handleWatchClick = (nugget, event) => {
    event.stopPropagation(); // Prevent triggering nugget card click
    
    if (!nugget.session_id) {
      console.error('Nugget missing session_id:', nugget);
      return;
    }
    
    const sessionData = savedSessions.find(session => session.id === nugget.session_id);
    
    if (!sessionData) {
      console.error('Session not found for nugget:', nugget.session_id);
      return;
    }
    
    if (sessionData && sessionData.recording_url) {
      setVideoNugget(nugget);
      setVideoSessionData(sessionData);
      setIsVideoModalOpen(true);
    } else {
      // Fallback: open in new tab if no video URL or modal not possible
      if (sessionData?.recording_url && nugget.timestamp) {
        window.open(createTimestampedUrl(sessionData.recording_url, nugget.timestamp), '_blank');
      } else if (sessionData?.recording_url) {
        window.open(sessionData.recording_url, '_blank');
      }
    }
  };

  // Function to close video modal
  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setVideoNugget(null);
    setVideoSessionData(null);
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
        (nugget.tags && Array.isArray(nugget.tags) && activeTagFilters.some(filter => {
          // Handle both tag IDs (numbers) and tag strings
          return nugget.tags.some(tag => 
            typeof tag === 'number' ? tag === filter.id : 
            typeof tag === 'string' ? tag.toString() === filter.id.toString() || tag.toLowerCase().includes(filter.name?.toLowerCase() || '') :
            false
          );
        }));

      return matchesSearch && matchesCategories && matchesTags;
    } catch (error) {
      console.error('Error filtering nugget:', error, nugget);
      return false; // Exclude problematic nuggets
    }
  });

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

        <TagFilters
          activeFilters={activeFilters}
          addFilter={addFilter}
          removeFilter={removeFilter}
          clearTagFilters={clearTagFilters}
          getTagFilterCount={getTagFilterCount}
        />

        <StatisticsCards
          totalNuggets={totalNuggets}
          totalSessions={totalSessions}
          painPoints={painPoints}
          positiveNuggets={positiveNuggets}
        />

        {/* Main Content Area with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <CategoryFilters
            activeFilters={activeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            clearCategoryFilters={clearCategoryFilters}
            getCategoryFilterCount={getCategoryFilterCount}
          />

          {/* Nuggets Content */}
          <div className="lg:col-span-3 space-y-4 bg-background">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {filteredNuggets.length} insights found
              </h2>
            </div>

            {filteredNuggets.map(nugget => (
              <RepositoryNuggetCard
                key={nugget.id}
                nugget={nugget}
                onNuggetClick={handleNuggetClick}
                onWatchClick={handleWatchClick}
              />
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

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        videoSessionData={videoSessionData}
        videoNugget={videoNugget}
      />
    </div>
  );
};

export default RepositorySearchView;
