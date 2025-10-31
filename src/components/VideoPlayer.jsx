import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { isGoogleDriveUrl, getEmbedUrl, createTimestampedUrl } from '@/lib/videoUtils';

/**
 * VideoPlayer component for embedding Google Drive videos
 * 
 * @param {Object} props
 * @param {string} props.videoUrl - The Google Drive video URL
 * @param {string} props.timestamp - Optional timestamp in HH:MM:SS format
 * @param {boolean} props.autoplay - Whether to autoplay the video (default: false)
 * @param {boolean} props.showControls - Whether to show video controls (default: true)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showFallbackLink - Whether to show fallback link if embed fails (default: true)
 */
const VideoPlayer = ({ 
  videoUrl, 
  timestamp = null, 
  autoplay = false, 
  showControls = true,
  className = '',
  showFallbackLink = true 
}) => {
  const [embedUrl, setEmbedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);

  useEffect(() => {
    if (!videoUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    if (!isGoogleDriveUrl(videoUrl)) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const embed = getEmbedUrl(videoUrl, timestamp);
    if (embed) {
      setEmbedUrl(embed);
      setIsLoading(false);
      setHasError(false);
      
      // Check if video might have permission issues after a delay
      // (we can't actually check this reliably without making a request)
      // Show warning if it's a Google Drive URL but might not be publicly accessible
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [videoUrl, timestamp]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
    setShowPermissionWarning(true);
  };

  const fallbackUrl = timestamp ? createTimestampedUrl(videoUrl, timestamp) : videoUrl;

  if (hasError || !embedUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-muted rounded-lg border border-border ${className}`}>
        <AlertCircle className="w-8 h-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground mb-2 text-center">
          Unable to embed video
        </p>
        {showPermissionWarning && (
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
            The video may not be publicly accessible. Make sure the Google Drive file is shared with "Anyone with the link can view" permissions.
          </p>
        )}
        {showFallbackLink && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open video in new tab
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
        <iframe
          src={embedUrl}
          className="absolute top-0 left-0 w-full h-full rounded-lg border border-border"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{ minHeight: '400px' }}
        />
      </div>
      {showFallbackLink && (
        <div className="mt-2 flex items-center justify-end">
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3 h-3" />
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
