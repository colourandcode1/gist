import React, { useState, useEffect } from 'react';
import { Video, Check, FolderOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isGoogleDriveUrl, extractDriveFileId } from '@/lib/videoUtils';
import { getProjects } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const SessionDetailsForm = ({ 
  sessionData, 
  setSessionData, 
  sessionTypes, 
  autoFillSuggestions 
}) => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser]);

  const loadProjects = async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const activeProjects = await getProjects(currentUser.uid);
      // Filter to only active projects
      const filtered = activeProjects.filter(p => p.status === 'active');
      setProjects(filtered);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

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

        {/* Participant Context Section */}
        <div className="pt-2 border-t border-border">
          <label className="block text-sm font-medium text-secondary-text mb-3">
            Participant Context <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Company Name</label>
              <Input
                type="text"
                value={sessionData.participantContext?.companyName || ''}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  participantContext: {
                    ...prev.participantContext,
                    companyName: e.target.value
                  }
                }))}
                placeholder="Acme Corp"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company Size</label>
                <select
                  value={sessionData.participantContext?.companySize || ''}
                  onChange={(e) => setSessionData(prev => ({
                    ...prev,
                    participantContext: {
                      ...prev.participantContext,
                      companySize: e.target.value || null
                    }
                  }))}
                  className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                >
                  <option value="">Select size</option>
                  <option value="smb">SMB</option>
                  <option value="mid_market">Mid-Market</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">User Type</label>
                <select
                  value={sessionData.participantContext?.userType || ''}
                  onChange={(e) => setSessionData(prev => ({
                    ...prev,
                    participantContext: {
                      ...prev.participantContext,
                      userType: e.target.value || null
                    }
                  }))}
                  className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                >
                  <option value="">Select type</option>
                  <option value="admin">Admin</option>
                  <option value="end_user">End User</option>
                  <option value="decision_maker">Decision Maker</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">User Role/Title</label>
              <Input
                type="text"
                value={sessionData.participantContext?.userRole || ''}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  participantContext: {
                    ...prev.participantContext,
                    userRole: e.target.value
                  }
                }))}
                placeholder="Product Manager"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Industry</label>
                <Input
                  type="text"
                  value={sessionData.participantContext?.industry || ''}
                  onChange={(e) => setSessionData(prev => ({
                    ...prev,
                    participantContext: {
                      ...prev.participantContext,
                      industry: e.target.value
                    }
                  }))}
                  placeholder="Technology"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Tenure</label>
                <select
                  value={sessionData.participantContext?.productTenure || ''}
                  onChange={(e) => setSessionData(prev => ({
                    ...prev,
                    participantContext: {
                      ...prev.participantContext,
                      productTenure: e.target.value || null
                    }
                  }))}
                  className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                >
                  <option value="">Select tenure</option>
                  <option value="new">New</option>
                  <option value="regular">Regular</option>
                  <option value="power_user">Power User</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-text mb-1">Project <span className="text-muted-foreground">(optional)</span></label>
          <select
            value={sessionData.projectId || ''}
            onChange={(e) => setSessionData(prev => ({ ...prev, projectId: e.target.value || null }))}
            className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            disabled={isLoadingProjects}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {isLoadingProjects && (
            <p className="mt-1 text-xs text-muted-foreground">Loading projects...</p>
          )}
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
