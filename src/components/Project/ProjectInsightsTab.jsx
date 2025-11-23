import React from 'react';
import { User, PenTool } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ProjectInsightsTab = ({ nuggets, projectId }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Insights from Project Sessions</h3>
      </div>
      {nuggets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No insights created yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {nuggets.map((nugget) => (
            <Card key={nugget.id}>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2">{nugget.observation}</h4>
                <p className="text-sm text-muted-foreground italic mb-2">"{nugget.evidence_text}"</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline">{nugget.category}</Badge>
                  <span className="text-xs text-muted-foreground">{nugget.session_title}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {nugget.speaker && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Speaker: {nugget.speaker}</span>
                    </div>
                  )}
                  {nugget.createdByName && (
                    <div className="flex items-center gap-1">
                      <PenTool className="w-3 h-3" />
                      <span>Created by {nugget.createdByName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

