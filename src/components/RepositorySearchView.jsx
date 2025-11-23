import React, { useState } from 'react';
import NavigationHeader from './NavigationHeader';
import TranscriptModal from './TranscriptModal';
import VideoModal from './VideoModal';
import { RepositoryHeader } from './Repository/RepositoryHeader';
import { RepositoryFilters } from './Repository/RepositoryFilters';
import { RepositoryResults } from './Repository/RepositoryResults';
import { useRepositoryData } from '@/hooks/useRepositoryData';
import { useRepositoryFilters } from '@/hooks/useRepositoryFilters';
import { useRepositoryModals } from '@/hooks/useRepositoryModals';
import { deleteNugget } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import { createTimestampedUrl } from '@/lib/videoUtils';

const RepositorySearchView = ({ onNavigate }) => {
  const { currentUser, userProfile, userOrganization } = useAuth();
  const [selectedNuggets, setSelectedNuggets] = useState(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Use custom hooks
  const { savedSessions, allNuggets, projects, isLoading, refreshData } = useRepositoryData(currentUser);
  const {
    activeFilters,
    searchQuery,
    setSearchQuery,
    addFilter,
    removeFilter,
    clearAllFilters,
    getCategoryFilterCount,
    getTagFilterCount,
    clearCategoryFilters,
    clearTagFilters,
    getAdvancedFilterCount,
    clearAdvancedFilters,
    filteredNuggets
  } = useRepositoryFilters(allNuggets, savedSessions);

  const {
    isModalOpen,
    selectedNugget,
    selectedSessionData,
    isVideoModalOpen,
    videoNugget,
    videoSessionData,
    handleNuggetClick,
    handleWatchClick: handleWatchClickBase,
    handleCloseVideoModal,
    handleCloseModal,
    handleEditInAnalysis
  } = useRepositoryModals(savedSessions, onNavigate);

  // Wrap handleWatchClick to include createTimestampedUrl
  const handleWatchClick = (nugget, event) => {
    handleWatchClickBase(nugget, event, createTimestampedUrl);
  };

  const toggleNuggetSelection = (nugget) => {
    const insightId = `${nugget.session_id}:${nugget.id}`;
    setSelectedNuggets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNuggets.size === filteredNuggets.length) {
      setSelectedNuggets(new Set());
    } else {
      const allIds = new Set(filteredNuggets.map(n => `${n.session_id}:${n.id}`));
      setSelectedNuggets(allIds);
    }
  };

  const handleBulkAddToTheme = async () => {
    if (selectedNuggets.size === 0) return;

    // Import dynamically to avoid circular dependencies
    const { getThemes, addInsightToTheme } = await import('@/lib/firestoreUtils');
    const themes = await getThemes(currentUser.uid);
    
    if (themes.length === 0) {
      if (window.confirm('No themes found. Would you like to create one?')) {
        // Navigate to create theme
        if (onNavigate) {
          onNavigate('/themes');
        }
      }
      return;
    }

    // Simple selection - in a real app, you'd show a dialog
    const selectedTheme = themes[0];
    
    try {
      for (const insightId of selectedNuggets) {
        await addInsightToTheme(selectedTheme.id, insightId, currentUser.uid);
      }
      alert(`Added ${selectedNuggets.size} insight(s) to "${selectedTheme.name}"`);
      setSelectedNuggets(new Set());
    } catch (error) {
      console.error('Error adding insights:', error);
      alert('Failed to add insights to theme');
    }
  };

  const handleDeleteNugget = async () => {
    if (!selectedNugget || !currentUser) return;

    const confirmed = window.confirm('Are you sure you want to delete this insight?');
    if (!confirmed) return;

    const result = await deleteNugget(selectedNugget.session_id, selectedNugget.id, currentUser.uid);
    
    if (result.success) {
      // Refresh data to update the UI
      await refreshData();
      // Close the modal after deletion
      handleCloseModal();
    } else {
      console.error('Failed to delete nugget:', result.error);
      alert('Failed to delete insight. Please try again.');
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader currentView="repository" onNavigate={onNavigate} />
      
      {/* Header with Search and Filters */}
      <div className="sticky top-16 z-30 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <RepositoryHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNewSession={() => onNavigate('upload')}
          />
          
          <RepositoryFilters
            activeFilters={activeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            clearAllFilters={clearAllFilters}
            clearCategoryFilters={clearCategoryFilters}
            clearTagFilters={clearTagFilters}
            clearAdvancedFilters={clearAdvancedFilters}
            getCategoryFilterCount={getCategoryFilterCount}
            getTagFilterCount={getTagFilterCount}
            getAdvancedFilterCount={getAdvancedFilterCount}
            isFiltersOpen={isFiltersOpen}
            onToggleFilters={() => setIsFiltersOpen(!isFiltersOpen)}
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading sessions...</p>
            </div>
          </div>
        ) : (
          <RepositoryResults
            filteredNuggets={filteredNuggets}
            allNuggets={allNuggets}
            savedSessions={savedSessions}
            projects={projects}
            selectedNuggets={selectedNuggets}
            toggleNuggetSelection={toggleNuggetSelection}
            handleNuggetClick={handleNuggetClick}
            handleWatchClick={handleWatchClick}
            handleBulkAddToTheme={handleBulkAddToTheme}
            toggleSelectAll={toggleSelectAll}
            userOrganization={userOrganization}
            userProfile={userProfile}
            onNavigate={onNavigate}
          />
        )}
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
