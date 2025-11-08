import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NavigationHeader from './NavigationHeader';
import TranscriptAnalysisView from './TranscriptAnalysisView';
import RepositorySearchView from './RepositorySearchView';
import SessionDetailsForm from './SessionDetailsForm';
import TranscriptUpload from './TranscriptUpload';

const SimplifiedUpload = () => {
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [sessionData, setSessionData] = useState({
    title: '',
    sessionDate: new Date().toISOString().split('T')[0],
    participantName: '',
    recordingUrl: '',
    transcriptContent: '',
    sessionType: 'user_interview',
    projectId: projectIdFromUrl || null
  });

  const [uploadMethod, setUploadMethod] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentView, setCurrentView] = useState('repository');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [analysisPrefill, setAnalysisPrefill] = useState(null);
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

  const handleNavigate = (viewOrPayload) => {
    const view = typeof viewOrPayload === 'string' ? viewOrPayload : viewOrPayload?.view;
    if (view === 'repository') {
      setCurrentView('repository');
      setAnalysisPrefill(null);
    } else if (view === 'upload') {
      setSessionData({
        title: '',
        sessionDate: new Date().toISOString().split('T')[0],
        participantName: '',
        recordingUrl: '',
        transcriptContent: '',
        sessionType: 'user_interview',
        projectId: projectIdFromUrl || null
      });
      setUploadMethod('');
      setShowPreview(false);
      setHasUnsavedChanges(false);
      setAutoFillSuggestions({});
      setCurrentView('upload');
      setAnalysisPrefill(null);
    } else if (view === 'analysis') {
      const payload = typeof viewOrPayload === 'object' ? viewOrPayload : null;
      if (payload?.session) {
        setSessionData(payload.session);
      }
      if (payload?.prefill) {
        setAnalysisPrefill(payload.prefill);
      } else {
        setAnalysisPrefill(null);
      }
      setCurrentView('analysis');
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
        prefill={analysisPrefill}
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
    if (files && files[0] && fileInputRef.current) {
      // Create a new FileList-like object and trigger the file input's onChange
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(changeEvent);
    }
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
            <SessionDetailsForm 
              sessionData={sessionData}
              setSessionData={setSessionData}
              sessionTypes={sessionTypes}
              autoFillSuggestions={autoFillSuggestions}
            />
          </div>

          <div className="lg:col-span-2">
            <TranscriptUpload
              uploadMethod={uploadMethod}
              setUploadMethod={setUploadMethod}
              sessionData={sessionData}
              setSessionData={setSessionData}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              autoFillSuggestions={autoFillSuggestions}
              setAutoFillSuggestions={setAutoFillSuggestions}
              fileInputRef={fileInputRef}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              handleQuickPaste={handleQuickPaste}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
              estimatedNuggets={estimatedNuggets}
            />
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

export default SimplifiedUpload;
