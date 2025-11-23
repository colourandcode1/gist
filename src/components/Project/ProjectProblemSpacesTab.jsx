import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ProjectProblemSpacesTab = ({ problemSpaces, nuggets }) => {
  const navigate = useNavigate();

  const getInsightCount = (problemSpace) => {
    const projectInsightIds = nuggets.map(n => `${n.session_id}:${n.id}`);
    return problemSpace.insightIds?.filter(id => projectInsightIds.includes(id)).length || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Problem Spaces Using Project Insights</h3>
      </div>
      {problemSpaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No problem spaces are using insights from this project</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {problemSpaces.map((ps) => (
            <Card key={ps.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/problem-spaces/${ps.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-foreground">{ps.name}</h4>
                    <p className="text-sm text-muted-foreground">{ps.description || 'No description'}</p>
                  </div>
                  <Badge variant="outline">
                    {getInsightCount(ps)} insights from this project
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

