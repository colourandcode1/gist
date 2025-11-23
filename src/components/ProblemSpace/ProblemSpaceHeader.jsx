import React from 'react';
import { 
  Edit, Save, X, Share2, Download, Copy, Trash2, 
  Lock, Globe 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const ProblemSpaceHeader = ({
  problemSpace,
  isEditing,
  editData,
  setEditData,
  isSaving,
  canEdit,
  currentUser,
  onEdit,
  onCancelEdit,
  onSave,
  onDuplicate,
  onShare,
  onExport,
  onDelete
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="text-2xl font-bold"
              />
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description"
                rows={2}
              />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{problemSpace.name}</h1>
              <p className="text-muted-foreground">{problemSpace.description || 'No description'}</p>
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <Badge variant={problemSpace.privacy === 'private' ? 'outline' : 'secondary'}>
              {problemSpace.privacy === 'private' ? (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 mr-1" />
                  Team
                </>
              )}
            </Badge>
            {problemSpace.outputType && (
              <Badge variant="outline">{problemSpace.outputType}</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {problemSpace.insightIds?.length || 0} insights
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={onCancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {canEdit && problemSpace.userId === currentUser?.uid && (
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

