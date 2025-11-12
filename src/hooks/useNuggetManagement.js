import { useState, useEffect } from 'react';
import { parseTranscript, findNearestTimestampBeforeText } from '@/lib/transcriptUtils';
import { DEFAULT_TAGS } from '@/lib/constants';

/**
 * Custom hook for managing nugget state and operations
 */
export const useNuggetManagement = (sessionData, prefill) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectedSentenceInfo, setSelectedSentenceInfo] = useState(null);
  const [nuggets, setNuggets] = useState([]);
  const [editingExisting, setEditingExisting] = useState(false);
  const [editingIds, setEditingIds] = useState({ sessionId: null, nuggetId: null });
  const [tags, setTags] = useState(DEFAULT_TAGS);
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

  // Pre-fill state when coming from repository edit flow
  useEffect(() => {
    if (prefill) {
      setEditingExisting(Boolean(prefill.nuggetId && prefill.sessionId));
      if (prefill.nuggetId && prefill.sessionId) {
        setEditingIds({ sessionId: prefill.sessionId, nuggetId: prefill.nuggetId });
      } else {
        setEditingIds({ sessionId: null, nuggetId: null });
      }
      
      const rawEvidence = prefill.selectedText || '';
      const evidence = rawEvidence.replace(/^\s*"|"\s*$/g, '').trim();
      setSelectedText(evidence);

      // Try to locate the specific dialogue content containing the evidence
      let matchedDialogueContent = sessionData.transcriptContent;
      try {
        const parsed = sessionData.transcriptContent ? parseTranscript(sessionData.transcriptContent) : null;
        if (parsed && Array.isArray(parsed.dialogue)) {
          const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const normEvidence = normalize(evidence);
          let found = parsed.dialogue.find(item => typeof item.content === 'string' && item.content.includes(evidence));
          if (!found) {
            found = parsed.dialogue.find(item => typeof item.content === 'string' && normalize(item.content).includes(normEvidence));
          }
          if (found) {
            matchedDialogueContent = found.content;
          }
        }
      } catch (_) {
        // fall back to full transcript content
      }

      setSelectedSentenceInfo({
        sentence: evidence,
        dialogueContent: matchedDialogueContent,
        dialogueElement: null,
      });
      setNewNugget(prev => ({
        ...prev,
        observation: prefill.observation || prev.observation,
        speaker: sessionData.participantName || prev.speaker,
        timestamp: prefill.timestamp || prev.timestamp,
        category: prefill.category || prev.category,
        tags: Array.isArray(prefill.tags) ? prefill.tags : prev.tags,
        evidence_text: evidence,
      }));

      // Re-apply selection shortly after mount to account for render timing
      const timeoutId = setTimeout(() => {
        setSelectedText(prev => prev || evidence);
        setSelectedSentenceInfo(prev => prev || {
          sentence: evidence,
          dialogueContent: matchedDialogueContent,
          dialogueElement: null,
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [prefill, sessionData]);

  const createNugget = () => {
    if (!newNugget.observation.trim() || !selectedText) return;

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

    const nugget = {
      id: Date.now(),
      observation: newNugget.observation,
      evidence_text: selectedText,
      speaker: newNugget.speaker || sessionData.participantName || 'Participant',
      timestamp: finalTimestamp,
      category: newNugget.category,
      tags: newNugget.tags,
      created_at: new Date().toLocaleString()
    };

    setNuggets([...nuggets, nugget]);
    setNewNugget({ observation: '', evidence_text: '', speaker: '', timestamp: '', category: 'general', tags: [] });
    setSelectedText('');
    setSelectedSentenceInfo(null);
  };

  return {
    selectedText,
    setSelectedText,
    selectedSentenceInfo,
    setSelectedSentenceInfo,
    nuggets,
    setNuggets,
    editingExisting,
    setEditingExisting,
    editingIds,
    setEditingIds,
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
  };
};

