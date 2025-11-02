import React from 'react';
import { User, Clock } from 'lucide-react';
import { createTimestampedUrl } from '@/lib/videoUtils';
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for displaying an individual research nugget
 */
const NuggetCard = ({ 
  nugget, 
  tags, 
  sessionData, 
  showVideoPlayer, 
  setCurrentVideoTimestamp 
}) => {
  const category = CATEGORIES.find(c => c.id === nugget.category);

  const handleTimestampClick = () => {
    if (showVideoPlayer) {
      // Update video player with new timestamp
      setCurrentVideoTimestamp(nugget.timestamp);
      // Scroll to video player if it's visible
      setTimeout(() => {
        const videoPlayer = document.querySelector('[data-video-player]');
        if (videoPlayer) {
          videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Open in new tab with timestamp
      window.open(createTimestampedUrl(sessionData.recordingUrl, nugget.timestamp), '_blank');
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-foreground text-sm leading-tight">{nugget.observation}</h3>
          {nugget.timestamp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <button
                onClick={handleTimestampClick}
                className="text-primary hover:text-primary/80"
                title={showVideoPlayer ? 'Jump to timestamp in video' : 'Open video at timestamp'}
              >
                {nugget.timestamp}
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-muted border-l-4 border-primary p-3 mb-3">
          <p className="text-sm text-foreground italic">"{nugget.evidence_text}"</p>
          {nugget.speaker && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {nugget.speaker}
            </div>
          )}
        </div>

        {/* Category Badge */}
        {category && (
          <div className="mb-2">
            <span
              className="px-2 py-1 text-xs rounded-full font-medium"
              style={{ 
                backgroundColor: `${category.color}15`,
                color: category.color,
                border: `1px solid ${category.color}30`
              }}
            >
              {category.name}
            </span>
          </div>
        )}

        {/* Tags */}
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

        <div className="text-xs text-muted-foreground">{nugget.created_at}</div>
      </div>
    </div>
  );
};

export default NuggetCard;

