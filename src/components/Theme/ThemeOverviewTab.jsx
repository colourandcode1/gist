import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ActivityFeed from '@/components/ActivityFeed';

export const ThemeOverviewTab = ({
  theme,
  isEditing,
  editData,
  setEditData,
  newQuestion,
  setNewQuestion,
  projects,
  onAddQuestion,
  onRemoveQuestion
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Problem Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Statement</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editData.problemStatement}
              onChange={(e) => setEditData({ ...editData, problemStatement: e.target.value })}
              placeholder="Describe the problem or opportunity..."
              rows={6}
            />
          ) : (
            <p className="text-foreground whitespace-pre-wrap">
              {theme.problemStatement || 'No problem statement defined'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Key Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Questions / Hypotheses</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              {(editData.keyQuestions || []).map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex-1 justify-start">
                    {question}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveQuestion(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddQuestion();
                    }
                  }}
                  placeholder="Add a key question..."
                />
                <Button variant="outline" onClick={onAddQuestion}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {theme.keyQuestions && theme.keyQuestions.length > 0 ? (
                theme.keyQuestions.map((question, index) => (
                  <Badge key={index} variant="secondary" className="mr-2">
                    {question}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No key questions defined</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {theme.linkedProjects && theme.linkedProjects.length > 0 ? (
            <div className="space-y-2">
              {theme.linkedProjects.map((projectId) => {
                const project = projects.find(p => p.id === projectId);
                return project ? (
                  <Button
                    key={projectId}
                    variant="outline"
                    onClick={() => navigate(`/projects/${projectId}`)}
                  >
                    {project.name}
                  </Button>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No linked projects</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{theme.insightIds?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{theme.contributors?.length || 1}</div>
            <p className="text-sm text-muted-foreground">Contributors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {theme.linkedProjects?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Linked Projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed themeId={theme.id} />
        </CardContent>
      </Card>
    </div>
  );
};

