import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { canUploadSessions } from '@/lib/permissions';

export const ProjectSessionsTab = ({ projectId, sessions, onRefresh }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sessions in this Project</h3>
        {canUploadSessions(userProfile?.role, userProfile?.is_admin) && (
          <Button onClick={() => navigate(`/?projectId=${projectId}`)}>
            Create New Session
          </Button>
        )}
      </div>
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No sessions in this project yet</p>
            {canUploadSessions(userProfile?.role, userProfile?.is_admin) && (
              <Button onClick={() => navigate(`/?projectId=${projectId}`)}>
                Create First Session
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/sessions/${session.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{session.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {session.session_date} • {session.session_type}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {session.nuggets?.length || 0} insights
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

