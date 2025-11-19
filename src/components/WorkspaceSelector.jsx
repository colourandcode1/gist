import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const WorkspaceSelector = () => {
  const { userWorkspaces, userOrganization, currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);

  // Get selected workspace from localStorage or default to first workspace
  useEffect(() => {
    if (userWorkspaces && userWorkspaces.length > 0) {
      const stored = localStorage.getItem('selectedWorkspaceId');
      if (stored && userWorkspaces.find(w => w.id === stored)) {
        setSelectedWorkspaceId(stored);
      } else {
        setSelectedWorkspaceId(userWorkspaces[0].id);
        localStorage.setItem('selectedWorkspaceId', userWorkspaces[0].id);
      }
    }
  }, [userWorkspaces]);

  const selectedWorkspace = userWorkspaces?.find(w => w.id === selectedWorkspaceId);

  const handleWorkspaceSelect = (workspaceId) => {
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem('selectedWorkspaceId', workspaceId);
  };

  const handleManageWorkspaces = () => {
    navigate('/workspaces');
  };

  if (!userOrganization || !userWorkspaces || userWorkspaces.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="w-4 h-4" />
          <span className="max-w-[150px] truncate">
            {selectedWorkspace?.name || 'Select Workspace'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userWorkspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleWorkspaceSelect(workspace.id)}
            className={selectedWorkspaceId === workspace.id ? 'bg-accent' : ''}
          >
            <Building2 className="w-4 h-4 mr-2" />
            <span className="flex-1 truncate">{workspace.name}</span>
            {selectedWorkspaceId === workspace.id && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageWorkspaces}>
          <Settings className="w-4 h-4 mr-2" />
          Manage Workspaces
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSelector;

