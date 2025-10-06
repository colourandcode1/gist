import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link, FileText, Video, Calendar, User, Tag, Check, ArrowRight, Clock, Copy, X, Play, Search, Plus, Save, ArrowLeft, Home, Database, Filter, TrendingUp, BarChart3, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

// Navigation Header Component
const NavigationHeader = ({ currentView, onNavigate, hasUnsavedChanges = false }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleNavigation = (view) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    onNavigate(view);
    setShowMobileMenu(false);
  };

  const navItems = [
    { id: 'repository', label: 'Repository', icon: Database },
    { id: 'upload', label: 'New Session', icon: Plus }
  ];

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Research Hub</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (item.id === 'upload' && currentView === 'analysis');
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation(item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden border-t border-border py-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleNavigation(item.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <Clock className="w-4 h-4" />
            <span>You have unsaved changes in this session</span>
          </div>
        </div>
      )}
    </nav>
  );
};

// Repository Search View Component 
const RepositorySearchView = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sampleNuggets = [
    {
      id: 1,
      observation: "Users struggle to find profile settings in the navigation",
      evidence_text: "I clicked around for like 2-3 minutes before I found it buried in a dropdown menu",
      session_title: "Mobile Navigation Test - Sarah M.",
      session_date: "2024-03-15",
      speaker: "Participant",
      timestamp: "00:02:20",
      tags: ["Navigation Issues", "Mobile", "Profile Settings"],
      sentiment: "frustrated"
    },
    {
      id: 2,
      observation: "Dashboard data visualization is highly appreciated",
      evidence_text: "I love the data visualization - it makes it easy to understand my usage patterns at a glance",
      session_title: "Mobile Navigation Test - Sarah M.",
      session_date: "2024-03-15",
      speaker: "Participant", 
      timestamp: "00:05:12",
      tags: ["Positive Feedback", "Dashboard", "Data Viz"],
      sentiment: "positive"
    },
    {
      id: 3,
      observation: "Onboarding flow causes confusion about account types",
      evidence_text: "I wasn't sure if I was signing up for a personal or business account",
      session_title: "Onboarding Flow Review - John D.",
      session_date: "2024-03-12",
      speaker: "Participant",
      timestamp: "00:01:45", 
      tags: ["Onboarding", "Account Setup", "Confusion"],
      sentiment: "confused"
    }
  ];

  const filteredNuggets = sampleNuggets.filter(nugget =>
    nugget.observation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.evidence_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.session_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'frustrated': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'confused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{sampleNuggets.length}</div>
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
                  <div className="text-2xl font-bold text-foreground">3</div>
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
                  <div className="text-2xl font-bold text-foreground">2</div>
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
                  <div className="text-2xl font-bold text-foreground">1</div>
                  <div className="text-sm text-muted-foreground">Positive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {filteredNuggets.length} insights found
            </h2>
          </div>

          {filteredNuggets.map(nugget => (
            <Card key={nugget.id} className="hover:shadow-md transition-shadow">
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
                    <Badge variant="outline" className={getSentimentColor(nugget.sentiment)}>
                      {nugget.sentiment}
                    </Badge>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      Watch
                    </Button>
                  </div>
                </div>

                <div className="bg-muted border-l-4 border-primary p-4 mb-4">
                  <p className="text-muted-foreground italic">"{nugget.evidence_text}"</p>
                </div>

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
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No insights found</p>
              <p className="text-sm">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Analysis View Component
const TranscriptAnalysisView = ({ sessionData, onNavigate, hasUnsavedChanges, setHasUnsavedChanges }) => {
  const [selectedText, setSelectedText] = useState('');
  const [nuggets, setNuggets] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [tags] = useState([
    { id: 1, name: 'Navigation Issues', category: 'pain_point', color: '#ef4444' },
    { id: 2, name: 'Positive Feedback', category: 'sentiment', color: '#10b981' },
    { id: 3, name: 'Feature Request', category: 'feature', color: '#3b82f6' },
    { id: 4, name: 'Onboarding', category: 'journey', color: '#f59e0b' }
  ]);
  const [newNugget, setNewNugget] = useState({
    observation: '',
    evidence_text: '',
    speaker: '',
    timestamp: '',
    tags: []
  });

  const handleSaveSession = async () => {
    setIsSaving(true);
    setSaveStatus('');

    try {
      const sessionPayload = {
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
          observation: nugget.observation,
          evidence_text: nugget.evidence_text,
          speaker: nugget.speaker,
          timestamp: nugget.timestamp,
          tags: nugget.tags
        }))
      };

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

  const createNugget = () => {
    if (!newNugget.observation.trim() || !selectedText) return;

    const nugget = {
      id: Date.now(),
      observation: newNugget.observation,
      evidence_text: selectedText,
      speaker: newNugget.speaker || sessionData.participantName || 'Participant',
      timestamp: newNugget.timestamp,
      tags: newNugget.tags,
      created_at: new Date().toLocaleString()
    };

    setNuggets([...nuggets, nugget]);
    setNewNugget({ observation: '', evidence_text: '', speaker: '', timestamp: '', tags: [] });
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

  const createTimestampUrl = (baseUrl, timestamp) => {
    if (!baseUrl || !timestamp) return baseUrl;
    const [minutes, seconds] = timestamp.split(':').slice(1);
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    return `${baseUrl}#t=${totalSeconds}s`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <NavigationHeader 
        currentView="analysis" 
        onNavigate={onNavigate} 
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">{sessionData.title}</h2>
              {sessionData.recordingUrl && (
                <a 
                  href={sessionData.recordingUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Video className="w-4 h-4" />
                  View Recording
                </a>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {sessionData.sessionDate} • {sessionData.participantName}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div 
              className="whitespace-pre-line text-sm leading-relaxed select-text"
              onMouseUp={handleTextSelection}
            >
              {sessionData.transcriptContent}
            </div>
          </div>

          {selectedText && (
            <div className="p-4 border-t border-gray-200 bg-blue-50">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Selected Text:</label>
                <div className="text-sm text-gray-600 bg-white p-2 rounded border italic">
                  "{selectedText}"
                </div>
              </div>
              
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observation/Insight:</label>
                <textarea
                  value={newNugget.observation}
                  onChange={(e) => setNewNugget(prev => ({ ...prev, observation: e.target.value }))}
                  placeholder="What did you learn from this? What's the key insight?"
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags:</label>
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
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={createNugget}
                disabled={!newNugget.observation.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Create Nugget
              </button>
            </div>
          )}
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Research Nuggets ({nuggets.length})</h2>
              <div className="flex items-center gap-2">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Session saved!
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onNavigate('repository')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Database className="w-4 h-4" />
                        View Repository
                      </button>
                      <button 
                        onClick={() => onNavigate('upload')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        New Session
                      </button>
                    </div>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="text-sm text-red-600">
                    Save failed. Try again.
                  </div>
                )}
                {saveStatus !== 'saved' && (
                  <button 
                    onClick={handleSaveSession}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {nuggets.map(nugget => (
              <div key={nugget.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight">{nugget.observation}</h3>
                    {nugget.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 ml-2 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <a 
                          href={createTimestampUrl(sessionData.recordingUrl, nugget.timestamp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {nugget.timestamp}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 border-l-4 border-blue-400 p-3 mb-3">
                    <p className="text-sm text-gray-700 italic">"{nugget.evidence_text}"</p>
                    {nugget.speaker && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        {nugget.speaker}
                      </div>
                    )}
                  </div>

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

                  <div className="text-xs text-gray-400">{nugget.created_at}</div>
                </div>
              </div>
            ))}

            {nuggets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No research nuggets yet</p>
                <p className="text-sm">Select text from the transcript to create your first insight nugget.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SimplifiedUpload = () => {
  const [sessionData, setSessionData] = useState({
    title: '',
    sessionDate: new Date().toISOString().split('T')[0],
    participantName: '',
    recordingUrl: '',
    transcriptContent: '',
    sessionType: 'user_interview'
  });

  const [uploadMethod, setUploadMethod] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentView, setCurrentView] = useState('upload');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoFillSuggestions, setAutoFillSuggestions] = useState({});
  const fileInputRef = useRef(null);

  const sessionTypes = [
    { value: 'user_interview', label: 'Interview', icon: '🎤' },
    { value: 'usability_test', label: 'Usability Test', icon: '🖥️' },
    { value: 'feedback_session', label: 'Feedback', icon: '💬' },
    { value: 'focus_group', label: 'Focus Group', icon: '👥' }
  ];

  const handleStartAnalysis = () => {
    setCurrentView('analysis');
  };

  const handleNavigate = (view) => {
    if (view === 'repository') {
      setCurrentView('repository');
    } else if (view === 'upload') {
      setSessionData({
        title: '',
        sessionDate: new Date().toISOString().split('T')[0],
        participantName: '',
        recordingUrl: '',
        transcriptContent: '',
        sessionType: 'user_interview'
      });
      setUploadMethod('');
      setShowPreview(false);
      setHasUnsavedChanges(false);
      setAutoFillSuggestions({});
      setCurrentView('upload');
    }
  };

  useEffect(() => {
    const hasData = sessionData.title.trim() || 
                   sessionData.recordingUrl.trim() || 
                   sessionData.transcriptContent.trim() ||
                   sessionData.participantName.trim();
    setHasUnsavedChanges(hasData && currentView !== 'repository');
  }, [sessionData, currentView]);

  const estimatedNuggets = sessionData.transcriptContent ? Math.floor(sessionData.transcriptContent.length / 500) : 0;

  if (currentView === 'analysis') {
    return (
      <TranscriptAnalysisView 
        sessionData={sessionData} 
        onNavigate={handleNavigate}
        hasUnsavedChanges={hasUnsavedChanges}
        setHasUnsavedChanges={setHasUnsavedChanges}
      />
    );
  }

  if (currentView === 'repository') {
    return <RepositorySearchView onNavigate={handleNavigate} />;
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  // Function to analyze transcript and auto-fill session details
  const analyzeTranscript = (transcript) => {
    if (!transcript || transcript.trim().length === 0) return {};
    
    const suggestions = {};
    
    // Extract participant names from structured titles and content
    const namePatterns = [
      // From titles like "User test 2 (Kate Kinney - Baxter College)"
      /\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]\s*[^)]*\)/gi,
      // From titles like "Interview with Sarah Johnson"
      /(?:interview|test|session|meeting)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      // From speaker labels like "Kate:" or "Participant Kate:"
      /(?:participant|user|interviewee|subject)?\s*([A-Z][a-z]+)[\s:]/gi,
      // From greetings and introductions
      /(?:hi|hello|hey)[\s,]+([A-Z][a-z]+)/gi,
      /(?:my name is|i'm|i am)[\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /(?:this is|it's)[\s]+([A-Z][a-z]+)/gi
    ];
    
    for (const pattern of namePatterns) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        // Extract the name from the match
        const nameMatch = matches[0].match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        if (nameMatch && nameMatch[1]) {
          suggestions.participantName = nameMatch[1];
          break;
        }
      }
    }
    
    // Extract dates from titles and content
    const datePatterns = [
      // From titles like "2025/02/26" or "2025-02-26"
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/gi,
      // From titles like "Feb 26, 2025" or "February 26, 2025"
      /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
      // From content like "Today is February 26, 2025"
      /(?:today is|date is|session date)[\s:]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi
    ];
    
    for (const pattern of datePatterns) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        const dateStr = matches[0];
        try {
          // Try to parse the date
          let parsedDate;
          if (dateStr.includes('/') || dateStr.includes('-')) {
            // Handle YYYY/MM/DD or YYYY-MM-DD format
            parsedDate = new Date(dateStr.replace(/[\/\-]/g, '-'));
          } else {
            // Handle "Feb 26, 2025" format
            parsedDate = new Date(dateStr);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            suggestions.sessionDate = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          // Continue to next pattern if parsing fails
        }
      }
    }
    
    // Detect session type based on content and title
    const content = transcript.toLowerCase();
    const title = transcript.split('\n')[0]?.toLowerCase() || '';
    
    if (content.includes('usability') || content.includes('task') || content.includes('click') || 
        content.includes('navigate') || title.includes('user test') || title.includes('usability')) {
      suggestions.sessionType = 'usability_test';
    } else if (content.includes('focus group') || content.includes('group discussion')) {
      suggestions.sessionType = 'focus_group';
    } else if (content.includes('feedback') || content.includes('opinion') || content.includes('suggest')) {
      suggestions.sessionType = 'feedback_session';
    } else {
      suggestions.sessionType = 'user_interview';
    }
    
    // Extract and clean title from first line
    const lines = transcript.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      let firstLine = lines[0].trim();
      
      // Clean up common transcript prefixes
      firstLine = firstLine.replace(/^(transcript|interview|session|meeting)[\s:]*/i, '');
      
      // If it looks like a structured title, use it
      if (firstLine.length > 10 && firstLine.length < 200) {
        suggestions.title = firstLine;
      }
    }
    
    return suggestions;
  };

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setUploadMethod('upload');
    
    if (!sessionData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setSessionData(prev => ({
        ...prev,
        title: fileName.charAt(0).toUpperCase() + fileName.slice(1)
      }));
    }
    
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const transcriptContent = e.target.result;
        const suggestions = analyzeTranscript(transcriptContent);
        
        setSessionData(prev => ({
          ...prev,
          transcriptContent,
          // Only auto-fill if fields are empty
          ...(prev.participantName === '' && suggestions.participantName && { participantName: suggestions.participantName }),
          ...(prev.sessionType === 'user_interview' && suggestions.sessionType && { sessionType: suggestions.sessionType }),
          ...(prev.title === '' && suggestions.title && { title: suggestions.title }),
          ...(prev.sessionDate === new Date().toISOString().split('T')[0] && suggestions.sessionDate && { sessionDate: suggestions.sessionDate })
        }));
        
        // Track what suggestions were applied
        setAutoFillSuggestions(suggestions);
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }, 1000);
  };

  const extractVideoId = (url) => {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const canStartAnalysis = () => {
    return sessionData.title.trim() && 
           sessionData.transcriptContent.trim();
  };

  const handleQuickPaste = () => {
    setUploadMethod('paste');
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    }, 100);
  };

  const previewTranscript = sessionData.transcriptContent ? 
    sessionData.transcriptContent.slice(0, 300) + (sessionData.transcriptContent.length > 300 ? '...' : '') : '';

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader 
        currentView="upload" 
        onNavigate={handleNavigate} 
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">New Research Session</h1>
          <p className="text-muted-foreground">Add your session details and transcript to start creating insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Session Details</CardTitle>
                  {Object.keys(autoFillSuggestions).length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Auto-filled from transcript</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                  <Input
                    type="text"
                    value={sessionData.title}
                    onChange={(e) => setSessionData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Mobile App Interview - Sarah"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                    <Input
                      type="date"
                      value={sessionData.sessionDate}
                      onChange={(e) => setSessionData(prev => ({ ...prev, sessionDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sessionTypes.map(type => (
                      <Button
                        key={type.value}
                        variant={sessionData.sessionType === type.value ? "default" : "outline"}
                        className="p-2 h-auto flex flex-col items-center justify-center"
                        onClick={() => setSessionData(prev => ({ ...prev, sessionType: type.value }))}
                      >
                        <div className="text-base mb-1">{type.icon}</div>
                        <div className="text-xs font-medium">{type.label}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Participant</label>
                  <Input
                    type="text"
                    value={sessionData.participantName}
                    onChange={(e) => setSessionData(prev => ({ ...prev, participantName: e.target.value }))}
                    placeholder="Sarah M."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Recording URL <span className="text-muted-foreground">(optional)</span></label>
                  <div className="relative">
                    <Input
                      type="url"
                      value={sessionData.recordingUrl}
                      onChange={(e) => setSessionData(prev => ({ ...prev, recordingUrl: e.target.value }))}
                      placeholder="https://drive.google.com/file/d/..."
                      className="pr-8"
                    />
                    <Video className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  </div>
                  {sessionData.recordingUrl && extractVideoId(sessionData.recordingUrl) && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Video linked</span>
                    </div>
                  )}
                </div>

                {(sessionData.title || sessionData.recordingUrl || sessionData.transcriptContent) && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span>{[sessionData.title, sessionData.transcriptContent].filter(Boolean).length}/2 required</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${[sessionData.title, sessionData.transcriptContent].filter(Boolean).length * 50}%` }}
                      />
                    </div>
                    {sessionData.recordingUrl && (
                      <div className="mt-2 text-xs text-green-600">
                        ✓ Recording URL provided (optional)
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transcript</CardTitle>
                  {sessionData.transcriptContent && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{sessionData.transcriptContent.length} characters</span>
                      <span>~{estimatedNuggets} potential insights</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>

                {!uploadMethod ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer"
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-sm font-medium text-foreground text-center">Drop file or click</div>
                        <div className="text-xs text-muted-foreground text-center">.txt, .docx, .pdf</div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.doc,.docx,.pdf"
                          onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                          className="hidden"
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleQuickPaste}
                        className="border-2 border-dashed h-auto p-4 flex flex-col items-center justify-center"
                      >
                        <FileText className="w-6 h-6 mb-2" />
                        <div className="text-sm font-medium">Paste transcript</div>
                        <div className="text-xs text-muted-foreground">Copy & paste text</div>
                      </Button>
                    </div>

                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>💡 Include timestamps like [00:02:15] for video linking</span>
                      </div>
                    </div>
                  </div>
                ) : uploadMethod === 'paste' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Paste your transcript:</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setUploadMethod('');
                          setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                          setAutoFillSuggestions({});
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={sessionData.transcriptContent}
                      onChange={(e) => {
                        const transcriptContent = e.target.value;
                        const suggestions = analyzeTranscript(transcriptContent);
                        
                        setSessionData(prev => ({
                          ...prev,
                          transcriptContent,
                          // Only auto-fill if fields are empty
                          ...(prev.participantName === '' && suggestions.participantName && { participantName: suggestions.participantName }),
                          ...(prev.sessionType === 'user_interview' && suggestions.sessionType && { sessionType: suggestions.sessionType }),
                          ...(prev.title === '' && suggestions.title && { title: suggestions.title }),
                          ...(prev.sessionDate === new Date().toISOString().split('T')[0] && suggestions.sessionDate && { sessionDate: suggestions.sessionDate })
                        }));
                        
                        // Track what suggestions were applied
                        setAutoFillSuggestions(suggestions);
                      }}
                      placeholder="[00:02:15] Interviewer: Can you tell me about your experience with the navigation menu?

[00:02:20] Participant: Yeah, so when I first logged in, I was really confused about where to find..."
                      rows="16"
                      className="font-mono text-sm resize-none"
                    />
                  </div>
                ) : isProcessing ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Processing transcript...</p>
                  </div>
                ) : sessionData.transcriptContent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">✓ Transcript ready</span>
                      <div className="flex items-center gap-2">
                        {sessionData.transcriptContent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                          >
                            {showPreview ? 'Hide' : 'Preview'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUploadMethod('');
                            setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                            setAutoFillSuggestions({});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {showPreview && (
                      <div className="bg-muted border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2">Preview (first 300 characters):</div>
                        <div className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                          {previewTranscript || 'No content to preview'}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div>
                        <div className="text-lg font-bold text-green-800 dark:text-green-200">
                          {sessionData.transcriptContent ? Math.floor(sessionData.transcriptContent.length / 100) / 10 : 0}k
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">characters</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-800 dark:text-green-200">
                          {sessionData.transcriptContent ? (sessionData.transcriptContent.match(/\[.*?\]/g) || []).length : 0}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">timestamps</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-800 dark:text-green-200">~{estimatedNuggets}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">insights</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {canStartAnalysis() ? 
              "Ready to start creating research nuggets! 🎉" : 
              "Fill in the details above to get started"
            }
          </div>
          
          <Button
            onClick={handleStartAnalysis}
            disabled={!canStartAnalysis()}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="research-hub-theme">
      <SimplifiedUpload />
    </ThemeProvider>
  );
}

export default App;

