import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ProjectThemesTab = ({ themes, nuggets }) => {
  const navigate = useNavigate();

  const getInsightCount = (theme) => {
    const projectInsightIds = nuggets.map(n => `${n.session_id}:${n.id}`);
    return theme.insightIds?.filter(id => projectInsightIds.includes(id)).length || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Themes Using Project Insights</h3>
      </div>
      {themes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No themes are using insights from this project</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {themes.map((theme) => (
            <Card key={theme.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/themes/${theme.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{theme.name}</h4>
                    <p className="text-sm text-muted-foreground">{theme.description || 'No description'}</p>
                  </div>
                  <Badge variant="outline">
                    {getInsightCount(theme)} insights from this project
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

