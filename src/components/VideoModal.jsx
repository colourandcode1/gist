import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import VideoPlayer from './VideoPlayer';

/**
 * Component for displaying video in a modal
 */
const VideoModal = ({ isOpen, onClose, videoSessionData, videoNugget }) => {
  if (!isOpen || !videoSessionData || !videoNugget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 1 }}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] mx-4 flex flex-col" style={{ zIndex: 2 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {videoSessionData.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {videoSessionData.session_date}
              </div>
              {videoNugget.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Timestamp: {videoNugget.timestamp}
                </div>
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

        {/* Video Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {videoSessionData.recording_url ? (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">{videoNugget.observation}</h3>
              <VideoPlayer
                videoUrl={videoSessionData.recording_url}
                timestamp={videoNugget.timestamp || null}
                className="w-full mb-4"
              />
              {videoNugget.evidence_text && (
                <div className="bg-muted border-l-4 border-primary p-4 mt-4">
                  <p className="text-sm text-foreground italic">"{videoNugget.evidence_text}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recording URL available for this session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

