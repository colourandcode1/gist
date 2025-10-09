import React, { useState } from 'react';
import { Video, User, Clock, Plus, Save, Database, Check, Tag, Sparkles } from 'lucide-react';
import NavigationHeader from './NavigationHeader';
import { parseTranscript } from '@/lib/transcriptUtils';
import { saveSession } from '@/lib/storageUtils';
import { highlightSentimentWords, extractSentenceFromText } from '@/lib/sentimentUtils';
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const TranscriptAnalysisView = ({ sessionData, onNavigate, hasUnsavedChanges, setHasUnsavedChanges }) => {
  const [selectedText, setSelectedText] = useState('');
  const [nuggets, setNuggets] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showSentiment, setShowSentiment] = useState(false);
  // Separate categories and tags
  const [categories] = useState([
    { id: 'pain_point', name: 'Pain Point', color: '#ef4444', description: 'Issues or problems users encounter' },
    { id: 'sentiment', name: 'Positive Feedback', color: '#10b981', description: 'Positive user feedback or satisfaction' },
    { id: 'feature', name: 'Feature Request', color: '#3b82f6', description: 'User suggestions for new features' },
    { id: 'journey', name: 'User Journey', color: '#f59e0b', description: 'Insights about user flow or process' },
    { id: 'usability', name: 'Usability', color: '#8b5cf6', description: 'Interface or design issues' },
    { id: 'performance', name: 'Performance', color: '#06b6d4', description: 'Speed or technical performance issues' },
    { id: 'general', name: 'General', color: '#6b7280', description: 'General insights or observations' }
  ]);

  const [tags, setTags] = useState([
    { id: 1, name: 'Navigation', color: '#3b82f6' },
    { id: 2, name: 'Checkout', color: '#10b981' },
    { id: 3, name: 'Mobile', color: '#f59e0b' },
    { id: 4, name: 'Search', color: '#8b5cf6' },
    { id: 5, name: 'Onboarding', color: '#06b6d4' },
    { id: 6, name: 'Pricing', color: '#ef4444' }
  ]);

  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');
  const [newNugget, setNewNugget] = useState({
    observation: '',
    evidence_text: '',
    speaker: '',
    timestamp: '',
    category: 'general',
    tags: []
  });

  const handleSaveSession = async () => {
    setIsSaving(true);
    setSaveStatus('');

    try {
      const sessionId = `session_${Date.now()}`;
      const sessionPayload = {
        id: sessionId,
        title: sessionData.title,
        description: '',
        session_date: sessionData.sessionDate,
        session_type: sessionData.sessionType,
        participant_info: {
          name: sessionData.participantName
        },
        recording_url: sessionData.recordingUrl,
        transcript_content: sessionData.transcriptContent,
        nuggets: nuggets.map(nugget => ({
          id: nugget.id,
          observation: nugget.observation,
          evidence_text: nugget.evidence_text,
          speaker: nugget.speaker,
          timestamp: nugget.timestamp,
          category: nugget.category,
          tags: nugget.tags,
          created_at: nugget.created_at
        })),
        created_at: new Date().toISOString()
      };

      // Save to localStorage using utility function
      const success = saveSession(sessionPayload);
      
      if (!success) {
        throw new Error('Failed to save session');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Saving session:', sessionPayload);
      
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      setTimeout(() => setSaveStatus(''), 5000);
      
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection().toString();
    if (selection.trim()) {
      setSelectedText(selection);
      const timestampMatch = selection.match(/\[(\d{2}:\d{2}:\d{2})\]/);
      if (timestampMatch) {
        setNewNugget(prev => ({ ...prev, timestamp: timestampMatch[1] }));
      }
    }
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
      
      // Look for the dialogue content in the parent structure
      while (parentElement && !dialogueContent) {
        if (parentElement.classList.contains('text-sm') && parentElement.textContent) {
          dialogueContent = parentElement.textContent;
          break;
        }
        parentElement = parentElement.parentElement;
      }
      
      if (dialogueContent) {
        // Extract the full sentence containing the clicked word
        const sentence = extractSentenceFromText(dialogueContent, clickedWord);
        
        if (sentence) {
          setSelectedText(sentence);
          
          // Extract timestamp if present in the sentence
          const timestampMatch = sentence.match(/\[(\d{2}:\d{2}:\d{2})\]/);
          if (timestampMatch) {
            setNewNugget(prev => ({ ...prev, timestamp: timestampMatch[1] }));
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

  const createNugget = () => {
    if (!newNugget.observation.trim() || !selectedText) return;

    const nugget = {
      id: Date.now(),
      observation: newNugget.observation,
      evidence_text: selectedText,
      speaker: newNugget.speaker || sessionData.participantName || 'Participant',
      timestamp: newNugget.timestamp,
      category: newNugget.category,
      tags: newNugget.tags,
      created_at: new Date().toLocaleString()
    };

    setNuggets([...nuggets, nugget]);
    setNewNugget({ observation: '', evidence_text: '', speaker: '', timestamp: '', category: 'general', tags: [] });
    setSelectedText('');
    setHasUnsavedChanges(true);
  };

  const addTagToNugget = (tagId) => {
    if (!newNugget.tags.includes(tagId)) {
      setNewNugget(prev => ({
        ...prev,
        tags: [...prev.tags, tagId]
      }));
    }
  };

  const removeTagFromNugget = (tagId) => {
    setNewNugget(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }));
  };

  const createNewTag = () => {
    if (!newTagName.trim()) return;

    const newTag = {
      id: Date.now(),
      name: newTagName.trim(),
      color: newTagColor
    };

    setTags(prev => [...prev, newTag]);
    setNewTagName('');
    setNewTagColor('#6b7280');
    setIsCreatingTag(false);
    
    // Automatically add the new tag to the current nugget
    addTagToNugget(newTag.id);
  };

  const cancelCreateTag = () => {
    setNewTagName('');
    setNewTagColor('#6b7280');
    setIsCreatingTag(false);
  };

  const createTimestampUrl = (baseUrl, timestamp) => {
    if (!baseUrl || !timestamp) return baseUrl;
    const [minutes, seconds] = timestamp.split(':').slice(1);
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    return `${baseUrl}#t=${totalSeconds}s`;
  };

  // Parse transcript for structured display
  const parsedTranscript = sessionData.transcriptContent ? parseTranscript(sessionData.transcriptContent) : null;

  // Component for styled transcript display
  const StyledTranscriptDisplay = ({ dialogue, attendees, showSentiment }) => {
    if (!dialogue || dialogue.length === 0) return null;

    return (
      <div className="space-y-6">
        {/* Attendees Section */}
        {attendees && attendees.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Attendees</h3>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {attendees.map((attendee, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center">
                      <span className="w-2 h-2 bg-primary/60 rounded-full mr-3 flex-shrink-0"></span>
                      {attendee}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transcript Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Transcript</h3>
          <div className="space-y-2">
            {dialogue.map((item, index) => {
              if (item.type === 'dialogue') {
                return (
                  <div key={index} className="grid grid-cols-12 gap-2 py-1 hover:bg-muted/30 transition-colors rounded px-1">
                    <div className="col-span-2">
                      <span className="text-sm font-semibold text-primary">
                        {item.speaker}
                      </span>
                    </div>
                    <div className="col-span-10">
                      <div 
                        className="text-sm text-foreground leading-relaxed select-text"
                        dangerouslySetInnerHTML={{
                          __html: showSentiment ? highlightSentimentWords(item.content, true) : item.content
                        }}
                      />
                    </div>
                  </div>
                );
              } else if (item.type === 'timestamp') {
                return (
                  <div key={index} className="py-1">
                    <span className="text-xs text-muted-foreground font-mono font-semibold">
                      {item.content}
                    </span>
                  </div>
                );
              } else {
                return (
                  <div key={index} className="py-1">
                    <div 
                      className="text-sm text-foreground leading-relaxed select-text"
                      dangerouslySetInnerHTML={{
                        __html: showSentiment ? highlightSentimentWords(item.content, true) : item.content
                      }}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader 
        currentView="analysis" 
        onNavigate={onNavigate} 
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-1/2 bg-card border-r border-border flex flex-col">
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
              {sessionData.recordingUrl && (
                <a 
                  href={sessionData.recordingUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <Video className="w-4 h-4" />
                  View Recording
                </a>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {sessionData.sessionDate} • {sessionData.participantName}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {parsedTranscript ? (
              <div onMouseUp={handleTextSelection} onClick={handleSentimentWordClick}>
                <StyledTranscriptDisplay 
                  dialogue={parsedTranscript.dialogue} 
                  attendees={parsedTranscript.attendees}
                  showSentiment={showSentiment}
                />
              </div>
            ) : (
              <div 
                className="whitespace-pre-line text-sm leading-relaxed select-text text-foreground"
                onMouseUp={handleTextSelection}
                onClick={handleSentimentWordClick}
                dangerouslySetInnerHTML={{
                  __html: showSentiment ? highlightSentimentWords(sessionData.transcriptContent, true) : sessionData.transcriptContent
                }}
              />
            )}
          </div>

        </div>

        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Research Nuggets ({nuggets.length})</h2>
              <div className="flex items-center gap-2">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      Session saved!
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onNavigate('repository')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Database className="w-4 h-4" />
                        View Repository
                      </button>
                      <button 
                        onClick={() => onNavigate('upload')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New Session
                      </button>
                    </div>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Save failed. Try again.
                  </div>
                )}
                {saveStatus !== 'saved' && (
                  <button 
                    onClick={handleSaveSession}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Session
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {nuggets.map(nugget => (
              <div key={nugget.id} className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm leading-tight">{nugget.observation}</h3>
                    {nugget.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <a 
                          href={createTimestampUrl(sessionData.recordingUrl, nugget.timestamp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          {nugget.timestamp}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-muted border-l-4 border-primary p-3 mb-3">
                    <p className="text-sm text-foreground italic">"{nugget.evidence_text}"</p>
                    {nugget.speaker && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {nugget.speaker}
                      </div>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="mb-2">
                    {(() => {
                      const category = categories.find(c => c.id === nugget.category);
                      return category ? (
                        <span
                          className="px-2 py-1 text-xs rounded-full font-medium"
                          style={{ 
                            backgroundColor: `${category.color}15`,
                            color: category.color,
                            border: `1px solid ${category.color}30`
                          }}
                        >
                          {category.name}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {nugget.tags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <span
                          key={tagId}
                          className="px-2 py-1 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                            border: `1px solid ${tag.color}30`
                          }}
                        >
                          {tag.name}
                        </span>
                      ) : null;
                    })}
                  </div>

                  <div className="text-xs text-muted-foreground">{nugget.created_at}</div>
                </div>
              </div>
            ))}

            {/* Empty Nugget Card Template - always visible */}
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm border-dashed border-primary/30">
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <textarea
                    value={newNugget.observation}
                    onChange={(e) => setNewNugget(prev => ({ ...prev, observation: e.target.value }))}
                    placeholder="What's the key insight?"
                    className="w-full text-sm font-medium text-foreground bg-transparent border-none resize-none focus:outline-none placeholder:text-muted-foreground"
                    rows="2"
                  />
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {newNugget.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="text-primary">
                          {newNugget.timestamp}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const category = categories.find(c => c.id === newNugget.category);
                      return category ? (
                        <span
                          className="px-2 py-1 text-xs rounded-full font-medium"
                          style={{ 
                            backgroundColor: `${category.color}15`,
                            color: category.color,
                            border: `1px solid ${category.color}30`
                          }}
                        >
                          {category.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
                
                <div className="bg-muted border-l-4 border-primary p-3 mb-3">
                  {selectedText ? (
                    <p className="text-sm text-foreground italic">"{selectedText}"</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Select text from the transcript to create an insight...</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <input
                      type="text"
                      value={newNugget.speaker || sessionData.participantName || 'Participant'}
                      onChange={(e) => setNewNugget(prev => ({ ...prev, speaker: e.target.value }))}
                      className="bg-transparent border-none text-xs text-muted-foreground focus:outline-none"
                      placeholder="Speaker name"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-foreground mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-1">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setNewNugget(prev => ({ ...prev, category: category.id }))}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          newNugget.category === category.id
                            ? 'font-medium'
                            : 'hover:bg-muted'
                        }`}
                        style={newNugget.category === category.id ? {
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
                </div>

                {/* Tags Selection */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-foreground mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => newNugget.tags.includes(tag.id) 
                          ? removeTagFromNugget(tag.id) 
                          : addTagToNugget(tag.id)
                        }
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          newNugget.tags.includes(tag.id)
                            ? 'font-medium'
                            : 'hover:bg-muted'
                        }`}
                        style={newNugget.tags.includes(tag.id) ? {
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
                    
                    {/* Create New Tag Button */}
                    {!isCreatingTag && (
                      <button
                        onClick={() => setIsCreatingTag(true)}
                        className="px-2 py-1 text-xs rounded-full border border-dashed border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        New Tag
                      </button>
                    )}
                  </div>
                </div>

                {/* Create Tag Form */}
                {isCreatingTag && (
                  <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Tag Name</label>
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTagName.trim()) {
                              createNewTag();
                            } else if (e.key === 'Escape') {
                              cancelCreateTag();
                            }
                          }}
                          placeholder="Enter tag name..."
                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="w-8 h-6 border border-border rounded cursor-pointer"
                          />
                          <span className="text-xs text-muted-foreground">{newTagColor}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={createNewTag}
                          disabled={!newTagName.trim()}
                          className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Create Tag
                        </button>
                        <button
                          onClick={cancelCreateTag}
                          className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/90 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date().toLocaleString()}
                  </div>
                  <button
                    onClick={createNugget}
                    disabled={!newNugget.observation.trim() || !selectedText}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Nugget
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptAnalysisView;
