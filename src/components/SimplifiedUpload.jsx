import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import NavigationHeader from './NavigationHeader';
import TranscriptAnalysisView from './TranscriptAnalysisView';
import RepositorySearchView from './RepositorySearchView';
import SessionDetailsForm from './SessionDetailsForm';
import TranscriptUpload from './TranscriptUpload';
import { getProjectById, saveSession } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const SimplifiedUpload = () => {
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const { currentUser, userWorkspaces } = useAuth();

  const [sessionData, setSessionData] = useState({
    title: '',
    sessionDate: new Date().toISOString().split('T')[0],
    participantName: '',
    recordingUrl: '',
    transcriptContent: '',
    sessionType: 'user_interview',
    customSessionType: '',
    projectId: projectIdFromUrl || null,
    workspaceId: null
  });

  // Set default workspace from localStorage or first available
  useEffect(() => {
    if (userWorkspaces && userWorkspaces.length > 0 && !sessionData.workspaceId) {
      const stored = localStorage.getItem('selectedWorkspaceId');
      const defaultWorkspaceId = stored && userWorkspaces.find(w => w.id === stored)
        ? stored
        : userWorkspaces[0].id;
      setSessionData(prev => ({ ...prev, workspaceId: defaultWorkspaceId }));
    }
  }, [userWorkspaces, sessionData.workspaceId]);

  const [uploadMethod, setUploadMethod] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentView, setCurrentView] = useState(projectIdFromUrl ? 'upload' : 'repository');
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false);
  const [analysisPrefill, setAnalysisPrefill] = useState(null);
  const [autoFillSuggestions, setAutoFillSuggestions] = useState({});
  const [project, setProject] = useState(null);
  const fileInputRef = useRef(null);

  const sessionTypes = [
    { value: 'user_interview', label: 'Interview', icon: '💬' },
    { value: 'usability_test', label: 'Usability Test', icon: '🖥️' },
    { value: 'feedback_session', label: 'Feedback', icon: '💭' },
    { value: 'focus_group', label: 'Focus Group', icon: '👥' },
    { value: 'other', label: 'Other', icon: '➕' }
  ];

  const handleStartAnalysis = async () => {
    if (!currentUser) {
      alert('Please log in to save sessions');
      return;
    }

    setIsSavingSession(true);
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
        projectId: sessionData.projectId || null,
        workspaceId: sessionData.workspaceId || null,
        participantContext: sessionData.participantContext || null,
        nuggets: [] // Start with empty nuggets array
      };

      const result = await saveSession(sessionPayload, currentUser.uid);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save session');
      }

      // Update sessionData with the session ID
      setSessionData(prev => ({ ...prev, id: result.id }));
      
      // Show success state on button
      setIsSavingSession(false);
      setShowSaveSuccess(true);
      setShowSaveSuccessToast(true);
      
      // Wait 1 second to show success state, then navigate
      setTimeout(() => {
        setCurrentView('analysis');
        setShowSaveSuccess(false);
      }, 1000);
    } catch (error) {
      console.error('Error saving session:', error);
      setIsSavingSession(false);
      setShowSaveSuccess(false);
      alert(`Failed to save session: ${error.message}. Please try again.`);
    }
  };

  const handleNavigate = (viewOrPayload) => {
    const view = typeof viewOrPayload === 'string' ? viewOrPayload : viewOrPayload?.view;
    if (view === 'repository') {
      setCurrentView('repository');
      setAnalysisPrefill(null);
      setShowSaveSuccessToast(false);
    } else if (view === 'upload') {
      setSessionData({
        title: '',
        sessionDate: new Date().toISOString().split('T')[0],
        participantName: '',
        recordingUrl: '',
        transcriptContent: '',
        sessionType: 'user_interview',
        customSessionType: '',
        projectId: projectIdFromUrl || null
      });
      setUploadMethod('');
      setShowPreview(false);
      setAutoFillSuggestions({});
      setCurrentView('upload');
      setAnalysisPrefill(null);
      setShowSaveSuccessToast(false);
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
      // Only show toast for new sessions, not when navigating from repository
      if (!payload?.session?.id) {
        setShowSaveSuccessToast(false);
      }
      setCurrentView('analysis');
    }
  };

  useEffect(() => {
    // Update sessionData.projectId when projectIdFromUrl changes
    setSessionData(prev => ({
      ...prev,
      projectId: projectIdFromUrl || null
    }));
    // Switch to upload view if projectId is present and we're on repository view
    if (projectIdFromUrl && currentView === 'repository') {
      setCurrentView('upload');
    }
  }, [projectIdFromUrl, currentView]);

  useEffect(() => {
    // Fetch project details when projectIdFromUrl exists
    const fetchProject = async () => {
      if (projectIdFromUrl) {
        try {
          const projectData = await getProjectById(projectIdFromUrl);
          setProject(projectData);
        } catch (error) {
          console.error('Error fetching project:', error);
          setProject(null);
        }
      } else {
        setProject(null);
      }
    };
    fetchProject();
  }, [projectIdFromUrl]);

  if (currentView === 'analysis') {
    return (
      <TranscriptAnalysisView 
        sessionData={sessionData} 
        onNavigate={handleNavigate}
        prefill={analysisPrefill}
        showSaveSuccessToast={showSaveSuccessToast}
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
    const hasTitle = sessionData.title.trim();
    const hasTranscript = sessionData.transcriptContent.trim();
    const hasSessionType = sessionData.sessionType && 
      (sessionData.sessionType !== 'other' || sessionData.customSessionType?.trim());
    const hasParticipant = sessionData.participantName.trim();
    
    return hasTitle && hasTranscript && hasSessionType && hasParticipant;
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
      />
      
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">New Research Session</h1>
          <p className="text-muted-foreground">Add your session details and transcript to start creating insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6">
          <div>
            <SessionDetailsForm 
              sessionData={sessionData}
              setSessionData={setSessionData}
              sessionTypes={sessionTypes}
              autoFillSuggestions={autoFillSuggestions}
              project={project}
              transcriptContent={sessionData.transcriptContent}
            />
          </div>

          <div>
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
              handleStartAnalysis={handleStartAnalysis}
              canStartAnalysis={canStartAnalysis()}
              isSavingSession={isSavingSession}
              showSaveSuccess={showSaveSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedUpload;
