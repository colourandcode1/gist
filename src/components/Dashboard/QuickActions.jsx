import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, FolderOpen, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  canUploadSessions, 
  canCreateProjects, 
  canCreateProblemSpaces 
} from '@/lib/permissions';

const QuickActions = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const actions = [
    {
      label: 'New Session',
      icon: FileText,
      onClick: () => navigate('/'),
      description: 'Upload a new research session',
      color: 'bg-blue-500 hover:bg-blue-600',
      permission: () => canUploadSessions(userProfile?.role, userProfile?.is_admin)
    },
    {
      label: 'New Project',
      icon: FolderOpen,
      onClick: () => navigate('/projects'),
      description: 'Create a new research project',
      color: 'bg-green-500 hover:bg-green-600',
      permission: () => canCreateProjects(userProfile?.role, userProfile?.is_admin)
    },
    {
      label: 'New Problem Space',
      icon: Target,
      onClick: () => navigate('/problem-spaces'),
      description: 'Start organizing insights',
      color: 'bg-purple-500 hover:bg-purple-600',
      permission: () => canCreateProblemSpaces(userProfile?.role, userProfile?.is_admin)
    }
  ].filter(action => action.permission());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                onClick={action.onClick}
                className={`${action.color} text-white h-auto py-6 flex flex-col items-center gap-2`}
              >
                <Icon className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-semibold">{action.label}</div>
                  <div className="text-xs opacity-90 font-normal">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;

