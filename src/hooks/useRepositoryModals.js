import { useState } from 'react';
import { getSessionById } from '@/lib/firestoreUtils';

export const useRepositoryModals = (savedSessions, onNavigate) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNugget, setSelectedNugget] = useState(null);
  const [selectedSessionData, setSelectedSessionData] = useState(null);
  
  // Video modal state management
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoNugget, setVideoNugget] = useState(null);
  const [videoSessionData, setVideoSessionData] = useState(null);

  const handleNuggetClick = async (nugget) => {
    // Find the session data for this nugget (may not have transcript_content)
    let sessionData = savedSessions.find(session => session.id === nugget.session_id);
    
    if (sessionData) {
      // If transcript_content is missing, fetch the full session
      if (!sessionData.transcript_content && sessionData._hasTranscript) {
        const fullSession = await getSessionById(nugget.session_id);
        if (fullSession) {
          sessionData = fullSession;
        }
      }
      setSelectedNugget(nugget);
      setSelectedSessionData(sessionData);
      setIsModalOpen(true);
    } else {
      console.error('Session data not found for nugget:', nugget);
    }
  };

  const handleWatchClick = (nugget, event, createTimestampedUrl) => {
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

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setVideoNugget(null);
    setVideoSessionData(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNugget(null);
    setSelectedSessionData(null);
  };

  const handleEditInAnalysis = async () => {
    if (!selectedNugget || !selectedSessionData) return;
    
    // Ensure we have the full session data with transcript_content
    let sessionData = selectedSessionData;
    if (!sessionData.transcript_content && sessionData._hasTranscript) {
      const fullSession = await getSessionById(selectedNugget.session_id);
      if (fullSession) {
        sessionData = fullSession;
      }
    }
    
    // Navigate to analysis view with prefill context
    onNavigate({
      view: 'analysis',
      session: {
        id: sessionData.id || selectedNugget.session_id,
        title: sessionData.title,
        sessionDate: sessionData.session_date,
        participantName: sessionData.participant_info?.name || '',
        recordingUrl: sessionData.recording_url || '',
        transcriptContent: sessionData.transcript_content || '',
        sessionType: sessionData.session_type || 'user_interview',
        projectId: sessionData.projectId || null,
        participantContext: sessionData.participantContext || null
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

  return {
    isModalOpen,
    selectedNugget,
    selectedSessionData,
    isVideoModalOpen,
    videoNugget,
    videoSessionData,
    handleNuggetClick,
    handleWatchClick,
    handleCloseVideoModal,
    handleCloseModal,
    handleEditInAnalysis
  };
};

