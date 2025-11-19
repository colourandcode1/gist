import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import NavigationHeader from '@/components/NavigationHeader';
import { createProblemSpace, updateProblemSpace } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const ProblemSpaceForm = ({ problemSpace, onSave, onCancel }) => {
  const { currentUser, userWorkspaces } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'private',
    outputType: '',
    problemStatement: '',
    keyQuestions: [],
    initialInsights: [],
    workspaceId: null
  });
  const [newQuestion, setNewQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Set default workspace from localStorage or first available
  useEffect(() => {
    if (userWorkspaces && userWorkspaces.length > 0 && !formData.workspaceId) {
      const stored = localStorage.getItem('selectedWorkspaceId');
      const defaultWorkspaceId = stored && userWorkspaces.find(w => w.id === stored)
        ? stored
        : userWorkspaces[0].id;
      setFormData(prev => ({ ...prev, workspaceId: defaultWorkspaceId }));
    }
  }, [userWorkspaces]);

  useEffect(() => {
    if (problemSpace) {
      setFormData({
        name: problemSpace.name || '',
        description: problemSpace.description || '',
        privacy: problemSpace.privacy || 'private',
        outputType: problemSpace.outputType || '',
        problemStatement: problemSpace.problemStatement || '',
        keyQuestions: problemSpace.keyQuestions || [],
        initialInsights: [],
        workspaceId: problemSpace.workspaceId || null
      });
    }
  }, [problemSpace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        privacy: formData.privacy,
        outputType: formData.outputType || null,
        problemStatement: formData.problemStatement.trim(),
        keyQuestions: formData.keyQuestions,
        linkedProjects: [],
        insightIds: formData.initialInsights,
        workspaceId: formData.workspaceId || null
      };

      let result;
      if (problemSpace) {
        result = await updateProblemSpace(problemSpace.id, payload, currentUser.uid);
      } else {
        result = await createProblemSpace(payload, currentUser.uid);
      }

      if (result.success) {
        onSave();
      } else {
        setError(result.error || 'Failed to save problem space');
      }
    } catch (err) {
      console.error('Error saving problem space:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({
        ...formData,
        keyQuestions: [...formData.keyQuestions, newQuestion.trim()]
      });
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (index) => {
    setFormData({
      ...formData,
      keyQuestions: formData.keyQuestions.filter((_, i) => i !== index)
    });
  };

  const outputTypes = [
    'Research Report',
    'Presentation',
    'Product Requirements',
    'User Story Map',
    'Design Brief',
    'Other'
  ];

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {problemSpace ? 'Edit Problem Space' : 'Create Problem Space'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., User Onboarding Experience"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this problem space"
                  rows={3}
                />
              </div>

              {userWorkspaces && userWorkspaces.length > 0 && (
                <div>
                  <label htmlFor="workspace" className="block text-sm font-medium text-foreground mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Workspace
                  </label>
                  <select
                    id="workspace"
                    value={formData.workspaceId || ''}
                    onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value || null })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {userWorkspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the workspace this problem space belongs to
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Privacy Settings
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.privacy === 'team'}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, privacy: checked ? 'team' : 'private' })
                      }
                    />
                    <span className="text-sm text-foreground">Team (shared with team members)</span>
                  </div>
                  {formData.privacy === 'private' && (
                    <Badge variant="outline">Private</Badge>
                  )}
                  {formData.privacy === 'team' && (
                    <Badge variant="secondary">Team</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.privacy === 'private' 
                    ? 'Only you can view and edit this problem space'
                    : 'Team members can view and contribute to this problem space'}
                </p>
              </div>

              <div>
                <label htmlFor="outputType" className="block text-sm font-medium text-foreground mb-2">
                  Output Type (Optional)
                </label>
                <select
                  id="outputType"
                  value={formData.outputType}
                  onChange={(e) => setFormData({ ...formData, outputType: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select output type...</option>
                  {outputTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  What type of deliverable will this problem space become?
                </p>
              </div>

              <div>
                <label htmlFor="problemStatement" className="block text-sm font-medium text-foreground mb-2">
                  Problem Statement
                </label>
                <Textarea
                  id="problemStatement"
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  placeholder="Describe the problem or opportunity you're exploring..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Key Questions / Hypotheses
                </label>
                <div className="space-y-2">
                  {formData.keyQuestions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-1 justify-start">
                        {question}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(index)}
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
                          handleAddQuestion();
                        }
                      }}
                      placeholder="Add a key question or hypothesis..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddQuestion}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : problemSpace ? 'Update Problem Space' : 'Create Problem Space'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProblemSpaceForm;

