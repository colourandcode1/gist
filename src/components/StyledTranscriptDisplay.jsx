import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { highlightSentimentWords, highlightSelectedSentence } from '@/lib/sentimentUtils';

/**
 * Component for displaying transcript with structured dialogue and attendees
 */
const StyledTranscriptDisplay = ({ dialogue, attendees, showSentiment, selectedSentenceInfo }) => {
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
              // Check if this dialogue item contains the selected sentence
              const shouldHighlightSentence = selectedSentenceInfo && 
                selectedSentenceInfo.dialogueContent === item.content;
              
              return (
                <div key={index} className="grid grid-cols-12 gap-2 py-1 hover:bg-muted/30 transition-colors rounded px-1">
                  <div className="col-span-2">
                    <span className="text-sm font-semibold text-secondary-text">
                      {item.speaker}
                    </span>
                  </div>
                  <div className="col-span-10">
                    <div 
                      className="text-sm text-foreground leading-relaxed select-text"
                      dangerouslySetInnerHTML={{
                        __html: shouldHighlightSentence 
                          ? highlightSelectedSentence(item.content, selectedSentenceInfo.sentence, showSentiment)
                          : (showSentiment ? highlightSentimentWords(item.content, true) : item.content)
                      }}
                    />
                  </div>
                </div>
              );
            } else if (item.type === 'timestamp') {
              return (
                <div key={index} className="py-1">
                  <span className="text-xs text-secondary-text font-mono font-semibold">
                    {item.content}
                  </span>
                </div>
              );
            } else {
              // Check if this content item contains the selected sentence
              const shouldHighlightSentence = selectedSentenceInfo && 
                selectedSentenceInfo.dialogueContent === item.content;
              
              return (
                <div key={index} className="py-1">
                  <div 
                    className="text-sm text-foreground leading-relaxed select-text"
                    dangerouslySetInnerHTML={{
                      __html: shouldHighlightSentence 
                        ? highlightSelectedSentence(item.content, selectedSentenceInfo.sentence, showSentiment)
                        : (showSentiment ? highlightSentimentWords(item.content, true) : item.content)
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

export default StyledTranscriptDisplay;

