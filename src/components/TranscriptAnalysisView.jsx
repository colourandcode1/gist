import React, { useState, useEffect } from 'react';
import { Video, Sparkles, X, Maximize2 } from 'lucide-react';
import NavigationHeader from './NavigationHeader';
import { parseTranscript, findNearestTimestampBeforeText } from '@/lib/transcriptUtils';
import { updateSession, updateNuggetFields } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/ui/toast';
import { highlightSentimentWords, extractSentenceFromText, highlightSelectedSentence } from '@/lib/sentimentUtils';
import VideoPlayer from './VideoPlayer';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import StyledTranscriptDisplay from './StyledTranscriptDisplay';
import NuggetCard from './NuggetCard';
import NuggetForm from './NuggetForm';
import { useNuggetManagement } from '@/hooks/useNuggetManagement';
import { CATEGORIES } from '@/lib/constants';

const TranscriptAnalysisView = ({ sessionData, onNavigate, prefill, showSaveSuccessToast = false }) => {
  const { currentUser } = useAuth();
  const [showSentiment, setShowSentiment] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(null);
  const [isSavingNugget, setIsSavingNugget] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const {
    selectedText,
    setSelectedText,
    selectedSentenceInfo,
    setSelectedSentenceInfo,
    nuggets,
    setNuggets,
    editingExisting,
    setEditingExisting,
    editingIds,
    tags,
    setTags,
    isCreatingTag,
    setIsCreatingTag,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    newNugget,
    setNewNugget,
    createNugget
  } = useNuggetManagement(sessionData, prefill);

  // Show toast on mount if showSaveSuccessToast is true
  useEffect(() => {
    if (showSaveSuccessToast) {
      setShowToast(true);
    }
  }, [showSaveSuccessToast]);

  // Add document-level click handler for click-away functionality
  useEffect(() => {
    const handleDocumentClick = (event) => {
      const sentimentWord = event.target.closest('[data-sentiment-word="true"]');
      const nuggetForm = event.target.closest('.nugget-form');
      const transcriptArea = event.target.closest('.transcript-area');
      
      // Don't clear if clicking on sentiment words (let handleSentimentWordClick handle it)
      if (sentimentWord) {
        return;
      }
      
      // Don't clear if clicking on nugget form
      if (nuggetForm) {
        return;
      }
      
      // Don't clear if user is selecting text in transcript area
      if (transcriptArea && window.getSelection().toString().trim()) {
        return;
      }
      
      // Clear selection for any other click (including clicks on other sentences in transcript)
      setSelectedText('');
      setSelectedSentenceInfo(null);
    };

    // Add event listener to document with a slight delay to allow text selection to complete
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 0);

    // Cleanup function to remove event listener
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [setSelectedText, setSelectedSentenceInfo]);

  const saveExistingNugget = async () => {
    if (!editingExisting || !editingIds.sessionId || !editingIds.nuggetId || !currentUser) return;
    const result = await updateNuggetFields(editingIds.sessionId, editingIds.nuggetId, {
      observation: newNugget.observation,
      evidence_text: selectedText,
      speaker: newNugget.speaker || sessionData.participantName || 'Participant',
      timestamp: newNugget.timestamp,
      category: newNugget.category,
      tags: newNugget.tags,
    }, currentUser.uid);
    if (result.success) {
      onNavigate('repository');
    }
  };

  const handleCreateNugget = async () => {
    if (!currentUser || !sessionData.id) {
      alert('Session not saved yet. Please try again.');
      return;
    }

    if (!newNugget.observation.trim() || !selectedText) return;

    setIsSavingNugget(true);
    try {
      // Auto-detect timestamp if not already set
      let finalTimestamp = newNugget.timestamp;
      if (!finalTimestamp && sessionData.transcriptContent && selectedText) {
        const detected = findNearestTimestampBeforeText(
          sessionData.transcriptContent,
          selectedText
        );
        if (detected) {
          finalTimestamp = detected;
        }
      }

      // Create the nugget object
      const nugget = {
        id: Date.now(),
        observation: newNugget.observation,
        evidence_text: selectedText,
        speaker: newNugget.speaker || sessionData.participantName || 'Participant',
        timestamp: finalTimestamp || null,
        category: newNugget.category,
        tags: newNugget.tags,
        created_at: new Date().toLocaleString()
      };

      // Add nugget to the session's nuggets array
      const updatedNuggets = [...nuggets, nugget];
      const result = await updateSession(sessionData.id, {
        nuggets: updatedNuggets.map(n => ({
          id: n.id,
          observation: n.observation,
          evidence_text: n.evidence_text,
          speaker: n.speaker,
          timestamp: n.timestamp,
          category: n.category,
          tags: n.tags,
          created_at: n.created_at
        }))
      }, currentUser.uid);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save nugget');
      }

      // Update local state only after successful save
      setNuggets(updatedNuggets);
      setNewNugget({ observation: '', evidence_text: '', speaker: '', timestamp: '', category: 'general', tags: [] });
      setSelectedText('');
      setSelectedSentenceInfo(null);
    } catch (error) {
      console.error('Error saving nugget:', error);
      alert(`Failed to save nugget: ${error.message}. Please try again.`);
    } finally {
      setIsSavingNugget(false);
    }
  };

  const handleTextSelection = () => {
    // Use a small delay to ensure the selection is fully captured
    setTimeout(() => {
      const selection = window.getSelection().toString();
      if (selection.trim()) {
        setSelectedText(selection);
        setNewNugget(prev => ({ ...prev, evidence_text: selection.trim() }));
        setSelectedSentenceInfo(null); // Clear sentence highlighting when manually selecting text
        const timestampMatch = selection.match(/\[(\d{2}:\d{2}:\d{2})\]/);
        if (timestampMatch) {
          setNewNugget(prev => ({ ...prev, timestamp: timestampMatch[1], evidence_text: selection.trim() }));
        }
      }
    }, 10);
  };

  const handleSentimentWordClick = (event) => {
    const clickedElement = event.target;
    
    // Check if the clicked element is a sentiment word
    if (clickedElement.getAttribute('data-sentiment-word') === 'true') {
      event.preventDefault();
      event.stopPropagation();
      
      const clickedWord = clickedElement.textContent;
      
      // Find the parent dialogue item or content area
      let parentElement = clickedElement.parentElement;
      let dialogueContent = '';
      let dialogueElement = null;
      
      // Look for the dialogue content in the parent structure
      while (parentElement && !dialogueContent) {
        if (parentElement.classList.contains('text-sm') && parentElement.textContent) {
          dialogueContent = parentElement.textContent;
          dialogueElement = parentElement;
          break;
        }
        parentElement = parentElement.parentElement;
      }
      
      if (dialogueContent) {
        // Extract the full sentence containing the clicked word
        const sentence = extractSentenceFromText(dialogueContent, clickedWord);
        
        if (sentence) {
          const trimmedSentence = sentence.trim();
          setSelectedText(trimmedSentence);
          setNewNugget(prev => ({ ...prev, evidence_text: trimmedSentence }));
          
          // Store sentence info for highlighting
          setSelectedSentenceInfo({
            sentence: trimmedSentence,
            dialogueContent: dialogueContent,
            dialogueElement: dialogueElement
          });
          
          // Extract timestamp if present in the sentence
          const timestampMatch = trimmedSentence.match(/\[(\d{2}:\d{2}:\d{2})\]/);
          if (timestampMatch) {
            setNewNugget(prev => ({ ...prev, timestamp: timestampMatch[1], evidence_text: trimmedSentence }));
          }
          
          // Scroll to the nugget creation form
          const nuggetForm = document.querySelector('.bg-card.rounded-lg.border.border-border.p-4.shadow-sm.border-dashed');
          if (nuggetForm) {
            nuggetForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  };

  // Parse transcript for structured display
  const parsedTranscript = sessionData.transcriptContent ? parseTranscript(sessionData.transcriptContent) : null;

  return (
    <div className="bg-background min-h-screen">
      {showToast && (
        <Toast
          message="Session saved successfully"
          type="success"
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
      <NavigationHeader 
        currentView="analysis" 
        onNavigate={onNavigate}
      />
      
      <div className="flex h-[calc(100vh-64px)]">
        <div className={`${showVideoPlayer ? 'w-1/3' : 'w-1/2'} bg-card border-r border-border flex flex-col transition-all duration-300`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground">{sessionData.title}</h2>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sentiment Analysis</span>
                  <Switch
                    checked={showSentiment}
                    onCheckedChange={setShowSentiment}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sessionData.recordingUrl && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVideoPlayer(!showVideoPlayer)}
                      className="flex items-center gap-2"
                    >
                      {showVideoPlayer ? (
                        <>
                          <X className="w-4 h-4" />
                          Hide Video
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          Show Video
                        </>
                      )}
                    </Button>
                    <a 
                      href={sessionData.recordingUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                    >
                      <Maximize2 className="w-4 h-4" />
                      Open in New Tab
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {sessionData.sessionDate} • {sessionData.participantName}
            </div>
          </div>

          {showVideoPlayer && sessionData.recordingUrl && (
            <div className="p-4 border-b border-border bg-muted/30" data-video-player>
              <VideoPlayer
                key={currentVideoTimestamp || 'default'} // Force re-render when timestamp changes
                videoUrl={sessionData.recordingUrl}
                timestamp={currentVideoTimestamp}
                className="w-full"
              />
            </div>
          )}
          
          <div className="flex-1 p-4 overflow-y-auto transcript-area">
            {parsedTranscript ? (
              <div 
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleTextSelection();
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSentimentWordClick(e);
                }}
              >
                <StyledTranscriptDisplay 
                  dialogue={parsedTranscript.dialogue} 
                  attendees={parsedTranscript.attendees}
                  showSentiment={showSentiment}
                  selectedSentenceInfo={selectedSentenceInfo}
                />
              </div>
            ) : (
              <div 
                className="whitespace-pre-line text-sm leading-relaxed select-text text-foreground"
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleTextSelection();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSentimentWordClick(e);
                }}
                dangerouslySetInnerHTML={{
                  __html: selectedSentenceInfo && selectedSentenceInfo.dialogueContent === sessionData.transcriptContent
                    ? highlightSelectedSentence(sessionData.transcriptContent, selectedSentenceInfo.sentence, showSentiment)
                    : (showSentiment ? highlightSentimentWords(sessionData.transcriptContent, true) : sessionData.transcriptContent)
                }}
              />
            )}
          </div>
        </div>

        <div className={`${showVideoPlayer ? 'w-2/3' : 'w-1/2'} flex flex-col transition-all duration-300`}>
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Research Nuggets ({nuggets.length})</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {nuggets.map(nugget => (
              <NuggetCard
                key={nugget.id}
                nugget={nugget}
                tags={tags}
                sessionData={sessionData}
                showVideoPlayer={showVideoPlayer}
                setCurrentVideoTimestamp={setCurrentVideoTimestamp}
              />
            ))}

            <NuggetForm
              selectedText={selectedText}
              newNugget={newNugget}
              setNewNugget={setNewNugget}
              categories={CATEGORIES}
              tags={tags}
              setTags={setTags}
              isCreatingTag={isCreatingTag}
              setIsCreatingTag={setIsCreatingTag}
              newTagName={newTagName}
              setNewTagName={setNewTagName}
              newTagColor={newTagColor}
              setNewTagColor={setNewTagColor}
              editingExisting={editingExisting}
              onCreateNugget={handleCreateNugget}
              onSaveExisting={saveExistingNugget}
              sessionData={sessionData}
              isSaving={isSavingNugget}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptAnalysisView;
