import React from 'react';
import { Upload, FileText, Video, Clock, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { analyzeTranscript } from '@/lib/transcriptUtils';

const TranscriptUpload = ({ 
  uploadMethod, 
  setUploadMethod, 
  sessionData, 
  setSessionData, 
  isProcessing, 
  setIsProcessing,
  autoFillSuggestions,
  setAutoFillSuggestions,
  fileInputRef,
  handleDrag,
  handleDrop,
  handleQuickPaste,
  showPreview,
  setShowPreview,
  estimatedNuggets
}) => {
  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setUploadMethod('upload');
    
    if (!sessionData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setSessionData(prev => ({
        ...prev,
        title: fileName.charAt(0).toUpperCase() + fileName.slice(1)
      }));
    }
    
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const transcriptContent = e.target.result;
        const suggestions = analyzeTranscript(transcriptContent);
        
        setSessionData(prev => ({
          ...prev,
          transcriptContent,
          // Only auto-fill if fields are empty
          ...(prev.participantName === '' && suggestions.participantName && { participantName: suggestions.participantName }),
          ...(prev.sessionType === 'user_interview' && suggestions.sessionType && { sessionType: suggestions.sessionType }),
          ...(prev.title === '' && suggestions.title && { title: suggestions.title }),
          ...(prev.sessionDate === new Date().toISOString().split('T')[0] && suggestions.sessionDate && { sessionDate: suggestions.sessionDate })
        }));
        
        // Track what suggestions were applied
        setAutoFillSuggestions(suggestions);
        setIsProcessing(false);
      };
      reader.readAsText(file);
    }, 1000);
  };

  const previewTranscript = sessionData.transcriptContent ? 
    sessionData.transcriptContent.slice(0, 300) + (sessionData.transcriptContent.length > 300 ? '...' : '') : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transcript</CardTitle>
          {sessionData.transcriptContent && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{sessionData.transcriptContent.length} characters</span>
              <span>~{estimatedNuggets} potential insights</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!uploadMethod ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground text-center">Drop file or click</div>
                <div className="text-xs text-muted-foreground text-center">.txt, .docx, .pdf</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>

              <Button
                variant="outline"
                onClick={handleQuickPaste}
                className="border-2 border-dashed h-auto p-4 flex flex-col items-center justify-center"
              >
                <FileText className="w-6 h-6 mb-2" />
                <div className="text-sm font-medium">Paste transcript</div>
                <div className="text-xs text-muted-foreground">Copy & paste text</div>
              </Button>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>💡 Include timestamps like [00:02:15] for video linking</span>
              </div>
            </div>
          </div>
        ) : uploadMethod === 'paste' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paste your transcript:</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setUploadMethod('');
                  setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                  setAutoFillSuggestions({});
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={sessionData.transcriptContent}
              onChange={(e) => {
                const transcriptContent = e.target.value;
                const suggestions = analyzeTranscript(transcriptContent);
                
                setSessionData(prev => ({
                  ...prev,
                  transcriptContent,
                  // Only auto-fill if fields are empty
                  ...(prev.participantName === '' && suggestions.participantName && { participantName: suggestions.participantName }),
                  ...(prev.sessionType === 'user_interview' && suggestions.sessionType && { sessionType: suggestions.sessionType }),
                  ...(prev.title === '' && suggestions.title && { title: suggestions.title }),
                  ...(prev.sessionDate === new Date().toISOString().split('T')[0] && suggestions.sessionDate && { sessionDate: suggestions.sessionDate })
                }));
                
                // Track what suggestions were applied
                setAutoFillSuggestions(suggestions);
              }}
              placeholder="[00:02:15] Interviewer: Can you tell me about your experience with the navigation menu?

[00:02:20] Participant: Yeah, so when I first logged in, I was really confused about where to find..."
              rows="16"
              className="font-mono text-sm resize-none"
            />
          </div>
        ) : isProcessing ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Processing transcript...</p>
          </div>
        ) : sessionData.transcriptContent ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-600">✓ Transcript ready</span>
              <div className="flex items-center gap-2">
                {sessionData.transcriptContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Hide' : 'Preview'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setUploadMethod('');
                    setSessionData(prev => ({ ...prev, transcriptContent: '' }));
                    setAutoFillSuggestions({});
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {showPreview && (
              <div className="bg-muted border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">Preview (first 300 characters):</div>
                <div className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {previewTranscript || 'No content to preview'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                  {sessionData.transcriptContent ? Math.floor(sessionData.transcriptContent.length / 100) / 10 : 0}k
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">characters</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">
                  {sessionData.transcriptContent ? (sessionData.transcriptContent.match(/\[.*?\]/g) || []).length : 0}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">timestamps</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">~{estimatedNuggets}</div>
                <div className="text-xs text-green-600 dark:text-green-400">insights</div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default TranscriptUpload;
