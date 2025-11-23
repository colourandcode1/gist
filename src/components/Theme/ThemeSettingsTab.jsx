import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const ThemeSettingsTab = ({
  theme,
  canEdit,
  currentUser,
  onPrivacyChange
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Sharing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Privacy</p>
              <p className="text-sm text-muted-foreground">
                {theme.privacy === 'private' 
                  ? 'Only you can view and edit this theme'
                  : 'Team members can view and contribute'}
              </p>
            </div>
            {canEdit && theme.userId === currentUser?.uid && (
              <Switch
                checked={theme.privacy === 'team'}
                onCheckedChange={(checked) => onPrivacyChange(checked ? 'team' : 'private')}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Output type: {theme.outputType || 'Not set'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          {theme.contributors && theme.contributors.length > 0 ? (
            <div className="flex -space-x-2">
              {theme.contributors.map((contributorId, idx) => (
                <Avatar key={idx} className="w-10 h-10 border-2 border-background">
                  <AvatarFallback>
                    {contributorId.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No contributors</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

