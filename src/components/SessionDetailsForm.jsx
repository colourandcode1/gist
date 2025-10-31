import React from 'react';
import { Video, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isGoogleDriveUrl, extractDriveFileId } from '@/lib/videoUtils';

const SessionDetailsForm = ({ 
  sessionData, 
  setSessionData, 
  sessionTypes, 
  autoFillSuggestions 
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Session Details</CardTitle>
          {Object.keys(autoFillSuggestions).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" />
              <span>Auto-filled from transcript</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-text mb-1">Title</label>
          <Input
            type="text"
            value={sessionData.title}
            onChange={(e) => setSessionData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Mobile App Interview - Sarah"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium text-secondary-text mb-1">Date</label>
            <Input
              type="date"
              value={sessionData.sessionDate}
              onChange={(e) => setSessionData(prev => ({ ...prev, sessionDate: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-text mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {sessionTypes.map(type => (
              <Button
                key={type.value}
                variant={sessionData.sessionType === type.value ? "default" : "outline"}
                className="p-2 h-auto flex flex-col items-center justify-center"
                onClick={() => setSessionData(prev => ({ ...prev, sessionType: type.value }))}
              >
                <div className="text-base mb-1">{type.icon}</div>
                <div className="text-xs font-medium">{type.label}</div>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-text mb-1">Participant</label>
          <Input
            type="text"
            value={sessionData.participantName}
            onChange={(e) => setSessionData(prev => ({ ...prev, participantName: e.target.value }))}
            placeholder="Sarah M."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-text mb-1">Recording URL <span className="text-muted-foreground">(optional)</span></label>
          <div className="relative">
            <Input
              type="url"
              value={sessionData.recordingUrl}
              onChange={(e) => setSessionData(prev => ({ ...prev, recordingUrl: e.target.value }))}
              placeholder="https://drive.google.com/file/d/..."
              className="pr-8"
            />
            <Video className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          </div>
          {sessionData.recordingUrl && isGoogleDriveUrl(sessionData.recordingUrl) && extractDriveFileId(sessionData.recordingUrl) && (
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" />
              <span>Google Drive video linked</span>
            </div>
          )}
        </div>

        {(sessionData.title || sessionData.recordingUrl || sessionData.transcriptContent) && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{[sessionData.title, sessionData.transcriptContent].filter(Boolean).length}/2 required</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${[sessionData.title, sessionData.transcriptContent].filter(Boolean).length * 50}%` }}
              />
            </div>
            {sessionData.recordingUrl && (
              <div className="mt-2 text-xs text-green-600">
                ✓ Recording URL provided (optional)
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionDetailsForm;
