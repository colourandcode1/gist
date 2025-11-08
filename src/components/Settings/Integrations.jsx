import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plug, Cloud, Zap, Calendar, FileText, ExternalLink } from 'lucide-react';

const Integrations = () => {
  const [integrations, setIntegrations] = useState({
    googleDrive: { enabled: false, connected: false },
    oneDrive: { enabled: false, connected: false },
    slack: { enabled: false, connected: false },
    zapier: { enabled: false, connected: false },
    calendar: { enabled: false, connected: false },
    notion: { enabled: false, connected: false }
  });

  const [mcpIntegration, setMcpIntegration] = useState({
    enabled: false,
    endpoint: '',
    apiKey: '',
    dataSharing: false
  });

  const handleConnect = (integrationName) => {
    // TODO: Implement OAuth flow or API connection
    setIntegrations({
      ...integrations,
      [integrationName]: { ...integrations[integrationName], connected: true, enabled: true }
    });
  };

  const handleDisconnect = (integrationName) => {
    setIntegrations({
      ...integrations,
      [integrationName]: { ...integrations[integrationName], connected: false, enabled: false }
    });
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

      {/* MCP Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            MCP Integration (Q1 2026)
          </CardTitle>
          <CardDescription>Connect AI tools and configure endpoints for advanced automation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable MCP Integration</div>
              <div className="text-sm text-muted-foreground">Connect external AI tools and services</div>
            </div>
            <Switch
              checked={mcpIntegration.enabled}
              onCheckedChange={(checked) => setMcpIntegration({ ...mcpIntegration, enabled: checked })}
            />
          </div>

          {mcpIntegration.enabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">MCP Endpoint</label>
                <Input
                  value={mcpIntegration.endpoint}
                  onChange={(e) => setMcpIntegration({ ...mcpIntegration, endpoint: e.target.value })}
                  placeholder="https://api.example.com/mcp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  value={mcpIntegration.apiKey}
                  onChange={(e) => setMcpIntegration({ ...mcpIntegration, apiKey: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Data Sharing</div>
                  <div className="text-sm text-muted-foreground">Allow MCP tools to access your data</div>
                </div>
                <Switch
                  checked={mcpIntegration.dataSharing}
                  onCheckedChange={(checked) => setMcpIntegration({ ...mcpIntegration, dataSharing: checked })}
                />
              </div>
              <Button>Save MCP Configuration</Button>
            </>
          )}
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
    </div>
  );
};

export default Integrations;

