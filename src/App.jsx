import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link, FileText, Video, Calendar, User, Tag, Check, ArrowRight, Clock, Copy, X, Play, Search, Plus, Save, ArrowLeft, Home, Database, Filter, TrendingUp, BarChart3, Menu } from 'lucide-react';

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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Research Hub</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (item.id === 'upload' && currentView === 'analysis');
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
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
    <div className="bg-gray-50 min-h-screen">
      <NavigationHeader currentView="repository" onNavigate={onNavigate} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Research Repository</h1>
            <p className="text-gray-600">Search and discover insights from all your research sessions</p>
          </div>
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Session
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search insights, evidence, sessions, or tags..."
              className="w-full pl-10 pr-4 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{sampleNuggets.length}</div>
                <div className="text-sm text-gray-600">Total Insights</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">3</div>
                <div className="text-sm text-gray-600">Sessions</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">2</div>
                <div className="text-sm text-gray-600">Pain Points</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">1</div>
                <div className="text-sm text-gray-600">Positive</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredNuggets.length} insights found
            </h2>
          </div>

          {filteredNuggets.map(nugget => (
            <div key={nugget.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{nugget.observation}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
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
                  <span className={`px-2 py-1 text-xs rounded-full border ${getSentimentColor(nugget.sentiment)}`}>
                    {nugget.sentiment}
                  </span>
                  <button className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors">
                    <Video className="w-4 h-4" />
                    Watch
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-gray-700 italic">"{nugget.evidence_text}"</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {nugget.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="text-sm text-gray-500">
                  from {nugget.session_title}
                </div>
              </div>
            </div>
          ))}

          {filteredNuggets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
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
        setSessionData(prev => ({
          ...prev,
          transcriptContent: e.target.result
        }));
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
           sessionData.recordingUrl.trim() && 
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
    <div className="bg-gray-50 min-h-screen">
      <NavigationHeader 
        currentView="upload" 
        onNavigate={handleNavigate} 
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">New Research Session</h1>
          <p className="text-gray-600">Add your session details and transcript to start creating insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Session Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={sessionData.title}
                  onChange={(e) => setSessionData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Mobile App Interview - Sarah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={sessionData.sessionDate}
                    onChange={(e) => setSessionData(prev => ({ ...prev, sessionDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {sessionTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSessionData(prev => ({ ...prev, sessionType: type.value }))}
                      className={`p-2 text-left border rounded-lg hover:border-blue-300 transition-colors ${
                        sessionData.sessionType === type.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="text-base mb-1">{type.icon}</div>
                      <div className="text-xs font-medium text-gray-900">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Participant</label>
                <input
                  type="text"
                  value={sessionData.participantName}
                  onChange={(e) => setSessionData(prev => ({ ...prev, participantName: e.target.value }))}
                  placeholder="Sarah M."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recording URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={sessionData.recordingUrl}
                    onChange={(e) => setSessionData(prev => ({ ...prev, recordingUrl: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <Video className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                {sessionData.recordingUrl && extractVideoId(sessionData.recordingUrl) && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    <span>Video linked</span>
                  </div>
                )}
              </div>

              {(sessionData.title || sessionData.recordingUrl || sessionData.transcriptContent) && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{[sessionData.title, sessionData.recordingUrl, sessionData.transcriptContent].filter(Boolean).length}/3</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${[sessionData.title, sessionData.recordingUrl, sessionData.transcriptContent].filter(Boolean).length * 33.33}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Transcript</h3>
                {sessionData.transcriptContent && (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{sessionData.transcriptContent.length} characters</span>
                    <span>~{estimatedNuggets} potential insights</span>
                  </div>
                )}
              </div>

              {!uploadMethod ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                      <div className="text-sm font-medium text-gray-900 text-center">Drop file or click</div>
                      <div className="text-xs text-gray-500 text-center">.txt, .docx, .pdf</div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.doc,.docx,.pdf"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                    </div>

                    <button
                      onClick={handleQuickPaste}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                    >
                      <FileText className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                      <div className="text-sm font-medium text-gray-900">Paste transcript</div>
                      <div className="text-xs text-gray-500">Copy & paste text</div>
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>💡 Include timestamps like [00:02:15] for video linking</span>
                    </div>
                  </div>
                </div>
              ) : uploadMethod === 'paste' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paste your transcript:</span>
                    <button
                      onClick={() => {
                        setUploadMethod('');
                        setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={sessionData.transcriptContent}
                    onChange={(e) => setSessionData(prev => ({ ...prev, transcriptContent: e.target.value }))}
                    placeholder="[00:02:15] Interviewer: Can you tell me about your experience with the navigation menu?

[00:02:20] Participant: Yeah, so when I first logged in, I was really confused about where to find..."
                    rows="16"
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                  />
                </div>
              ) : isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600">Processing transcript...</p>
                </div>
              ) : sessionData.transcriptContent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">✓ Transcript ready</span>
                    <div className="flex items-center gap-2">
                      {sessionData.transcriptContent && (
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showPreview ? 'Hide' : 'Preview'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUploadMethod('');
                          setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showPreview && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-2">Preview (first 300 characters):</div>
                      <div className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                        {previewTranscript || 'No content to preview'}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-center bg-green-50 rounded-lg p-3">
                    <div>
                      <div className="text-lg font-bold text-green-800">
                        {sessionData.transcriptContent ? Math.floor(sessionData.transcriptContent.length / 100) / 10 : 0}k
                      </div>
                      <div className="text-xs text-green-600">characters</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-800">
                        {sessionData.transcriptContent ? (sessionData.transcriptContent.match(/\[.*?\]/g) || []).length : 0}
                      </div>
                      <div className="text-xs text-green-600">timestamps</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-800">~{estimatedNuggets}</div>
                      <div className="text-xs text-green-600">insights</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {canStartAnalysis() ? 
              "Ready to start creating research nuggets! 🎉" : 
              "Fill in the details above to get started"
            }
          </div>
          
          <button
            onClick={handleStartAnalysis}
            disabled={!canStartAnalysis()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedUpload;

