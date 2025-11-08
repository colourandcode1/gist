import React, { useState, useEffect } from 'react';
import { Edit, Save, X, History } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * EditableTranscript component for inline transcript editing
 * TODO: Add version history tracking in Firestore transcriptVersions subcollection
 */
const EditableTranscript = ({ 
  transcript, 
  onSave, 
  readOnly = false,
  showVersionHistory = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(transcript);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedContent(transcript);
  }, [transcript]);

  const handleStartEdit = () => {
    setEditedContent(transcript);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedContent(transcript);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (editedContent === transcript) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving transcript:', error);
      alert('Failed to save transcript. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (readOnly) {
    return (
      <div className="whitespace-pre-line text-sm leading-relaxed text-foreground bg-muted p-4 rounded-md">
        {transcript || 'No transcript content available'}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transcript</CardTitle>
          <div className="flex items-center gap-2">
            {showVersionHistory && (
              <Button variant="ghost" size="sm" disabled>
                <History className="w-4 h-4 mr-2" />
                Version History
                <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
              </Button>
            )}
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Transcript
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Enter transcript content..."
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Auto-save: Disabled (manual save required)</span>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-line text-sm leading-relaxed text-foreground bg-muted p-4 rounded-md">
            {transcript || 'No transcript content available'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditableTranscript;

