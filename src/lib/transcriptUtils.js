// Function to analyze transcript and auto-fill session details
export const analyzeTranscript = (transcript) => {
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

export const extractVideoId = (url) => {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

// Parse transcript into structured format for better display
export const parseTranscript = (transcriptContent) => {
  if (!transcriptContent || transcriptContent.trim().length === 0) {
    return { speakers: [], dialogue: [], attendees: [] };
  }

  const lines = transcriptContent.split('\n').filter(line => line.trim().length > 0);
  const speakers = new Set();
  const dialogue = [];
  const attendees = [];

  // Patterns for different transcript formats
  const timestampPattern = /\[(\d{2}:\d{2}:\d{2})\]/g;
  const speakerPattern = /^(\[?\d{2}:\d{2}:\d{2}\]?\s*)?([A-Za-z][A-Za-z\s]+?):\s*(.*)$/;
  const simpleSpeakerPattern = /^([A-Za-z][A-Za-z\s]+?):\s*(.*)$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Try to match structured speaker format with timestamp
    let match = trimmedLine.match(speakerPattern);
    if (match) {
      const [, timestamp, speaker, content] = match;
      const cleanSpeaker = speaker.trim();
      speakers.add(cleanSpeaker);
      
      dialogue.push({
        type: 'dialogue',
        speaker: cleanSpeaker,
        content: content.trim(),
        timestamp: timestamp ? timestamp.replace(/[\[\]]/g, '') : null,
        lineNumber: index
      });
      return;
    }

    // Try simple speaker format without timestamp
    match = trimmedLine.match(simpleSpeakerPattern);
    if (match) {
      const [, speaker, content] = match;
      const cleanSpeaker = speaker.trim();
      speakers.add(cleanSpeaker);
      
      dialogue.push({
        type: 'dialogue',
        speaker: cleanSpeaker,
        content: content.trim(),
        timestamp: null,
        lineNumber: index
      });
      return;
    }

    // Check if line contains only timestamps (standalone)
    if (timestampPattern.test(trimmedLine)) {
      dialogue.push({
        type: 'timestamp',
        content: trimmedLine,
        lineNumber: index
      });
      return;
    }

    // Regular content line
    dialogue.push({
      type: 'content',
      content: trimmedLine,
      lineNumber: index
    });
  });

  // Convert speakers set to array and sort
  const speakersArray = Array.from(speakers).sort();
  
  // Extract attendees from speakers (exclude common non-attendee speakers)
  const nonAttendeePatterns = ['interviewer', 'moderator', 'facilitator', 'researcher', 'note taker'];
  attendees.push(...speakersArray.filter(speaker => 
    !nonAttendeePatterns.some(pattern => 
      speaker.toLowerCase().includes(pattern.toLowerCase())
    )
  ));

  return {
    speakers: speakersArray,
    dialogue,
    attendees: attendees.length > 0 ? attendees : speakersArray
  };
};

/**
 * Find the nearest timestamp before a given evidence text in a transcript
 * Simple, elegant approach: direct text search + backwards timestamp lookup
 * @param {string} transcriptContent - The raw transcript text
 * @param {string} evidenceText - The quote/evidence text to search for
 * @returns {string|null} Timestamp in HH:MM:SS format, or null if not found
 */
export const findNearestTimestampBeforeText = (transcriptContent, evidenceText) => {
  try {
    // Validate inputs
    if (!transcriptContent || !transcriptContent.trim()) {
      return null;
    }
    if (!evidenceText || !evidenceText.trim()) {
      return null;
    }

    // Normalize text for matching: lowercase, collapse whitespace, remove quotes
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/^\s*["']|["']\s*$/g, '') // Remove surrounding quotes
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
    };

    const normalizedEvidence = normalizeText(evidenceText);
    if (!normalizedEvidence) {
      return null;
    }

    // Split transcript into lines
    const transcriptLines = transcriptContent.split('\n');
    
    // Find the first line containing a substantial chunk of the evidence text
    // Use first 50 chars or first 20 words, whichever is shorter
    const evidenceChunk = normalizedEvidence.length > 50 
      ? normalizedEvidence.substring(0, 50)
      : normalizedEvidence.split(/\s+/).slice(0, 20).join(' ');
    
    let foundLineIndex = -1;
    
    // Search for evidence text in transcript lines
    for (let i = 0; i < transcriptLines.length; i++) {
      const normalizedLine = normalizeText(transcriptLines[i]);
      
      // Direct substring match - if evidence chunk appears in line, or line appears in evidence
      if (normalizedLine.includes(evidenceChunk) || normalizedEvidence.includes(normalizedLine) || normalizedLine.includes(normalizedEvidence)) {
        foundLineIndex = i;
        break;
      }
    }

    // If not found, return null
    if (foundLineIndex === -1) {
      return null;
    }

    // Search backwards from found line for timestamp
    // Look up to 200 lines backwards (should cover most cases)
    // Start from line BEFORE the evidence (foundLineIndex - 1) to get the nearest timestamp BEFORE the quote
    const startSearchIndex = Math.max(0, foundLineIndex - 200);
    const timestampPattern = /\[?(\d{2}:\d{2}:\d{2})\]?/;
    
    for (let i = foundLineIndex - 1; i >= startSearchIndex; i--) {
      const line = transcriptLines[i];
      const match = line.match(timestampPattern);
      
      if (match && match[1]) {
        // Return timestamp as-is in HH:MM:SS format
        return match[1];
      }
    }

    // No timestamp found
    return null;
  } catch (error) {
    console.error('[DETECTION] Error finding nearest timestamp:', error);
    return null;
  }
};
