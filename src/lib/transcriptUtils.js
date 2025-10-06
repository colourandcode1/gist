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
