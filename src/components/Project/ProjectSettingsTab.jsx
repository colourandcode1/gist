import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProject } from '@/lib/firestoreUtils';

export const ProjectSettingsTab = ({ project, onUpdate, onDelete, currentUser }) => {
  const handleStatusChange = async (newStatus) => {
    if (!currentUser) return;
    const result = await updateProject(project.id, { status: newStatus }, currentUser.uid);
    if (result.success) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">Change the project status</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={project.status === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('active')}
              >
                Active
              </Button>
              <Button
                variant={project.status === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('completed')}
              >
                Completed
              </Button>
              <Button
                variant={project.status === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('archived')}
              >
                Archived
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                This will unassign all sessions from the project. Sessions and insights will not be deleted.
              </p>
            </div>
            <Button variant="destructive" onClick={onDelete}>
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

