import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cloud, Zap, Calendar, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getIntegrations, updateIntegration } from '@/lib/firestoreUtils';

const Integrations = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [integrations, setIntegrations] = useState({
    googleDrive: { enabled: false, connected: false },
    oneDrive: { enabled: false, connected: false },
    slack: { enabled: false, connected: false },
    zapier: { enabled: false, connected: false },
    calendar: { enabled: false, connected: false },
    notion: { enabled: false, connected: false }
  });


  useEffect(() => {
    if (currentUser) {
      loadIntegrations();
    } else {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  const loadIntegrations = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const integrationsData = await getIntegrations(currentUser.uid);
      if (integrationsData) {
        if (integrationsData.googleDrive) setIntegrations(prev => ({ ...prev, googleDrive: integrationsData.googleDrive }));
        if (integrationsData.oneDrive) setIntegrations(prev => ({ ...prev, oneDrive: integrationsData.oneDrive }));
        if (integrationsData.slack) setIntegrations(prev => ({ ...prev, slack: integrationsData.slack }));
        if (integrationsData.zapier) setIntegrations(prev => ({ ...prev, zapier: integrationsData.zapier }));
        if (integrationsData.calendar) setIntegrations(prev => ({ ...prev, calendar: integrationsData.calendar }));
        if (integrationsData.notion) setIntegrations(prev => ({ ...prev, notion: integrationsData.notion }));
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      setMessage({ type: 'error', text: 'Failed to load integrations' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (integrationName) => {
    if (!currentUser) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // TODO: Implement OAuth flow or API connection
      // For now, just save the connection state
      const updatedIntegration = { ...integrations[integrationName], connected: true, enabled: true };
      const result = await updateIntegration(currentUser.uid, integrationName, updatedIntegration);
      
      if (result.success) {
        setIntegrations({
          ...integrations,
          [integrationName]: updatedIntegration
        });
        setMessage({ type: 'success', text: `${integrationName} connected successfully` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to connect integration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to connect integration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (integrationName) => {
    if (!currentUser) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedIntegration = { ...integrations[integrationName], connected: false, enabled: false };
      const result = await updateIntegration(currentUser.uid, integrationName, updatedIntegration);
      
      if (result.success) {
        setIntegrations({
          ...integrations,
          [integrationName]: updatedIntegration
        });
        setMessage({ type: 'success', text: `${integrationName} disconnected successfully` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to disconnect integration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect integration' });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Storage Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Storage Providers
          </CardTitle>
          <CardDescription>Connect cloud storage services to backup and sync your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Drive */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium">Google Drive</div>
                <div className="text-sm text-muted-foreground">Backup sessions and transcripts</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {integrations.googleDrive.connected ? (
                <>
                  <Badge variant="secondary">Connected</Badge>
                  <Button variant="outline" onClick={() => handleDisconnect('googleDrive')}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('googleDrive')}>
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* OneDrive/SharePoint */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium">OneDrive / SharePoint</div>
                <div className="text-sm text-muted-foreground">Sync with Microsoft cloud storage</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {integrations.oneDrive.connected ? (
                <>
                  <Badge variant="secondary">Connected</Badge>
                  <Button variant="outline" onClick={() => handleDisconnect('oneDrive')}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleConnect('oneDrive')}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Other Integrations
          </CardTitle>
          <CardDescription>Connect with productivity and collaboration tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slack */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium">Slack</div>
                <div className="text-sm text-muted-foreground">Get notifications and updates in Slack</div>
              </div>
            </div>
            {integrations.slack.connected ? (
              <Button variant="outline" onClick={() => handleDisconnect('slack')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => handleConnect('slack')}>
                Connect
              </Button>
            )}
          </div>

          {/* Zapier/Webhooks */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="font-medium">Zapier / Webhooks</div>
                <div className="text-sm text-muted-foreground">Automate workflows with webhooks</div>
              </div>
            </div>
            {integrations.zapier.connected ? (
              <Button variant="outline" onClick={() => handleDisconnect('zapier')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => handleConnect('zapier')}>
                Connect
              </Button>
            )}
          </div>

          {/* Calendar Sync */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium">Calendar Sync</div>
                <div className="text-sm text-muted-foreground">Sync sessions with Google Calendar or Outlook</div>
              </div>
            </div>
            {integrations.calendar.connected ? (
              <Button variant="outline" onClick={() => handleDisconnect('calendar')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => handleConnect('calendar')}>
                Connect
              </Button>
            )}
          </div>

          {/* Notion/Confluence */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <div className="font-medium">Notion / Confluence</div>
                <div className="text-sm text-muted-foreground">Embed insights and problem spaces</div>
              </div>
            </div>
            {integrations.notion.connected ? (
              <Button variant="outline" onClick={() => handleDisconnect('notion')}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => handleConnect('notion')}>
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default Integrations;

