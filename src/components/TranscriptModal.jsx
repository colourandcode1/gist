import React, { useEffect, useRef, useState } from 'react';
import { X, Video, User, Clock, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { parseTranscript } from '@/lib/transcriptUtils';

const TranscriptModal = ({ isOpen, onClose, nugget, sessionData }) => {
  const transcriptRef = useRef(null);
  const [highlightedElement, setHighlightedElement] = useState(null);

  // Parse transcript for structured display
  const parsedTranscript = sessionData?.transcript_content ? parseTranscript(sessionData.transcript_content) : null;

  // Function to normalize text for comparison
  const normalizeText = (text) => {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  };

  // Function to find and highlight the quote in the transcript
  const findAndHighlightQuote = () => {
    if (!nugget?.evidence_text || !transcriptRef.current) return;

    const evidenceText = nugget.evidence_text.trim();
    const normalizedEvidenceText = normalizeText(evidenceText);
    const transcriptElement = transcriptRef.current;
    
    // Clear any existing highlights first
    clearHighlights();
    
    // Search through all text nodes in the transcript
    const walker = document.createTreeWalker(
      transcriptElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    let found = false;
    
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const normalizedText = normalizeText(text);
      
      // Try exact match first
      let index = text.indexOf(evidenceText);
      
      // If exact match fails, try normalized match
      if (index === -1) {
        const normalizedIndex = normalizedText.indexOf(normalizedEvidenceText);
        if (normalizedIndex !== -1) {
          // Find the actual text that matches
          const words = evidenceText.split(' ');
          let actualText = '';
          let searchIndex = normalizedIndex;
          
          for (const word of words) {
            const wordIndex = normalizedText.indexOf(normalizeText(word), searchIndex);
            if (wordIndex !== -1) {
              const startIndex = wordIndex;
              const endIndex = Math.min(startIndex + word.length, text.length);
              actualText = text.substring(startIndex, endIndex);
              searchIndex = wordIndex + word.length;
              break;
            }
          }
          
          if (actualText) {
            index = text.indexOf(actualText);
            if (index !== -1) {
              // Use the actual found text for highlighting
              const beforeText = text.substring(0, index);
              const afterText = text.substring(index + actualText.length);
              
              const highlightSpan = document.createElement('span');
              highlightSpan.className = 'bg-blue-500 text-white px-1 rounded font-medium';
              highlightSpan.textContent = actualText;
              
              const parent = node.parentNode;
              parent.insertBefore(document.createTextNode(beforeText), node);
              parent.insertBefore(highlightSpan, node);
              parent.insertBefore(document.createTextNode(afterText), node);
              parent.removeChild(node);
              
              setTimeout(() => {
                highlightSpan.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest'
                });
              }, 100);
              
              setHighlightedElement(highlightSpan);
              found = true;
              break;
            }
          }
        }
      } else {
        // Exact match found
        const beforeText = text.substring(0, index);
        const afterText = text.substring(index + evidenceText.length);
        
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'bg-blue-500 text-white px-1 rounded font-medium';
        highlightSpan.textContent = evidenceText;
        
        const parent = node.parentNode;
        parent.insertBefore(document.createTextNode(beforeText), node);
        parent.insertBefore(highlightSpan, node);
        parent.insertBefore(document.createTextNode(afterText), node);
        parent.removeChild(node);
        
        setTimeout(() => {
          highlightSpan.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 100);
        
        setHighlightedElement(highlightSpan);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn('Quote not found in transcript:', evidenceText);
    }
  };

  // Clear previous highlights
  const clearHighlights = () => {
    if (!transcriptRef.current) return;
    
    // Find and remove all highlight spans
    const highlightSpans = transcriptRef.current.querySelectorAll('.bg-blue-500');
    
    highlightSpans.forEach(span => {
      const parent = span.parentNode;
      const textContent = span.textContent;
      
      // Replace the highlight span with a text node
      const textNode = document.createTextNode(textContent);
      parent.replaceChild(textNode, span);
      
      // Merge adjacent text nodes
      parent.normalize();
    });
    
    setHighlightedElement(null);
  };

  // Effect to handle highlighting when modal opens
  useEffect(() => {
    if (isOpen && nugget) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      const highlightAfterRender = () => {
        if (transcriptRef.current && transcriptRef.current.textContent.length > 0) {
          clearHighlights();
          findAndHighlightQuote();
        } else {
          // Retry after a short delay if DOM isn't ready
          setTimeout(highlightAfterRender, 100);
        }
      };
      
      // Use requestAnimationFrame to ensure rendering is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(highlightAfterRender);
      });
    }
  }, [isOpen, nugget]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !nugget || !sessionData) return null;

  // Component for full transcript display (simplified format)
  const FullTranscriptDisplay = ({ dialogue }) => {
    if (!dialogue || dialogue.length === 0) return null;

    return (
      <div className="space-y-3">
        {dialogue.map((item, index) => {
          if (item.type === 'dialogue') {
            return (
              <div key={index} className="mb-2">
                <div className="text-sm font-medium text-foreground mb-1">
                  {item.speaker}
                </div>
                <div className="text-sm text-foreground leading-relaxed ml-4">
                  {item.content}
                </div>
              </div>
            );
          } else if (item.type === 'timestamp') {
            return (
              <div key={index} className="text-center py-2">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {item.content}
                </span>
              </div>
            );
          } else {
            return (
              <div key={index} className="text-sm text-foreground leading-relaxed mb-2">
                {item.content}
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 1 }}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col" style={{ zIndex: 2 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {sessionData.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {sessionData.session_date}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {sessionData.participant_info?.name || 'Unknown'}
              </div>
              {sessionData.recording_url && (
                <a 
                  href={sessionData.recording_url}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80"
                >
                  <Video className="w-4 h-4" />
                  View Recording
                </a>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>


        {/* Transcript Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">Transcript</h3>
          </div>
          <div ref={transcriptRef}>
            {/* Always use raw transcript content for now to avoid parsing issues */}
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {sessionData.transcript_content || 'No transcript content available'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptModal;
