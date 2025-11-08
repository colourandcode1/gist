import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Shield, Eye, Clock, Globe, Lock } from 'lucide-react';

const PrivacySecurity = () => {
  const [piiDetection, setPiiDetection] = useState({
    enabled: true,
    types: {
      email: true,
      phone: true,
      ssn: true,
      creditCard: false,
      address: false
    },
    redactionMethod: 'mask' // 'mask', 'remove', 'hash'
  });

  const [dataRetention, setDataRetention] = useState({
    transcripts: { enabled: true, days: 365 },
    nuggets: { enabled: true, days: 730 },
    sessionRecordings: { enabled: true, days: 90 },
    auditLogs: { enabled: true, days: 2555 }, // 7 years
    problemSpaces: { enabled: false, days: 0 }
  });

  const [dataResidency, setDataResidency] = useState({
    region: 'us-east-1'
  });

  const [accessControls, setAccessControls] = useState({
    ipAllowlisting: false,
    allowedIPs: [],
    sessionTimeout: 30, // minutes
    twoFactorAuth: false,
    problemSpaceSharing: 'team' // 'team', 'public', 'private'
  });

  const [newIP, setNewIP] = useState('');

  const handleAddIP = () => {
    if (newIP.trim() && !accessControls.allowedIPs.includes(newIP)) {
      setAccessControls({
        ...accessControls,
        allowedIPs: [...accessControls.allowedIPs, newIP]
      });
      setNewIP('');
    }
  };

  const handleRemoveIP = (ip) => {
    setAccessControls({
      ...accessControls,
      allowedIPs: accessControls.allowedIPs.filter(i => i !== ip)
    });
  };

  return (
    <div className="space-y-6">
      {/* PII Detection & Redaction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            PII Detection & Redaction
          </CardTitle>
          <CardDescription>Configure automatic detection and handling of personally identifiable information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable PII Detection</div>
              <div className="text-sm text-muted-foreground">Automatically detect and handle PII in transcripts</div>
            </div>
            <Switch
              checked={piiDetection.enabled}
              onCheckedChange={(checked) => setPiiDetection({ ...piiDetection, enabled: checked })}
            />
          </div>

          {piiDetection.enabled && (
            <>
              <div className="border-t pt-4 space-y-3">
                <div className="font-medium">PII Types to Detect</div>
                {Object.entries(piiDetection.types).map(([type, enabled]) => (
                  <div key={type} className="flex items-center justify-between">
                    <label className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setPiiDetection({
                          ...piiDetection,
                          types: { ...piiDetection.types, [type]: checked }
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Redaction Method</label>
                <select
                  value={piiDetection.redactionMethod}
                  onChange={(e) => setPiiDetection({ ...piiDetection, redactionMethod: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="mask">Mask (e.g., ***@***.com)</option>
                  <option value="remove">Remove Completely</option>
                  <option value="hash">Hash (One-way encryption)</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <Button variant="outline">View Audit Log</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Data Retention Policies
          </CardTitle>
          <CardDescription>Configure how long different types of data are retained</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(dataRetention).map(([key, policy]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-sm text-muted-foreground">
                  {policy.enabled ? `Retain for ${policy.days} days` : 'No retention limit'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {policy.enabled && (
                  <Input
                    type="number"
                    value={policy.days}
                    onChange={(e) =>
                      setDataRetention({
                        ...dataRetention,
                        [key]: { ...policy, days: parseInt(e.target.value) || 0 }
                      })
                    }
                    className="w-24"
                    min="0"
                  />
                )}
                <Switch
                  checked={policy.enabled}
                  onCheckedChange={(checked) =>
                    setDataRetention({
                      ...dataRetention,
                      [key]: { ...policy, enabled: checked }
                    })
                  }
                />
              </div>
            </div>
          ))}
          <Button>Save Retention Policies</Button>
        </CardContent>
      </Card>

      {/* Data Residency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Data Residency
          </CardTitle>
          <CardDescription>Select the region where your data is stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Storage Region</label>
            <select
              value={dataResidency.region}
              onChange={(e) => setDataResidency({ ...dataResidency, region: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">Europe (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground">
            Current region: {dataResidency.region}. Migration options available upon request.
          </p>
          <Button variant="outline">Request Migration</Button>
        </CardContent>
      </Card>

      {/* Access & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Access & Permissions
          </CardTitle>
          <CardDescription>Configure access controls and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">IP Allowlisting</div>
              <div className="text-sm text-muted-foreground">Restrict access to specific IP addresses</div>
            </div>
            <Switch
              checked={accessControls.ipAllowlisting}
              onCheckedChange={(checked) => setAccessControls({ ...accessControls, ipAllowlisting: checked })}
            />
          </div>

          {accessControls.ipAllowlisting && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="192.168.1.1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
                />
                <Button onClick={handleAddIP}>Add IP</Button>
              </div>
              {accessControls.allowedIPs.length > 0 && (
                <div className="space-y-1">
                  {accessControls.allowedIPs.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{ip}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveIP(ip)}>
                        <span className="text-xs">×</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <label className="text-sm font-medium">Session Timeout (minutes)</label>
            <Input
              type="number"
              value={accessControls.sessionTimeout}
              onChange={(e) => setAccessControls({ ...accessControls, sessionTimeout: parseInt(e.target.value) || 30 })}
              min="5"
              max="1440"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-muted-foreground">Require 2FA for all team members</div>
            </div>
            <Switch
              checked={accessControls.twoFactorAuth}
              onCheckedChange={(checked) => setAccessControls({ ...accessControls, twoFactorAuth: checked })}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <label className="text-sm font-medium">Problem Space Sharing</label>
            <select
              value={accessControls.problemSpaceSharing}
              onChange={(e) => setAccessControls({ ...accessControls, problemSpaceSharing: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="team">Team Only</option>
              <option value="public">Public (with link)</option>
              <option value="private">Private Only</option>
            </select>
          </div>

          <Button>Save Access Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacySecurity;

