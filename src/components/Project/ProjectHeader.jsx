import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { canUploadSessions } from '@/lib/permissions';

export const ProjectHeader = ({ project, userProfile, onNewSession, onEdit, onArchive, onDelete }) => {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </div>
        <p className="text-muted-foreground">{project.description || 'No description'}</p>
      </div>
      <div className="flex items-center gap-2">
        {canUploadSessions(userProfile?.role, userProfile?.is_admin) && (
          <Button 
            onClick={onNewSession}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Session
          </Button>
        )}
      </div>
    </div>
  );
};

