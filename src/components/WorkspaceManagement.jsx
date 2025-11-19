import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Users, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaces,
} from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateWorkspace, getWorkspaceLimit } from '@/lib/subscriptionUtils';
import { TIER_CONFIG } from '@/lib/pricingConstants';

const WorkspaceManagement = () => {
  const { currentUser, userOrganization, userWorkspaces, refreshUserProfile } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState({});

  useEffect(() => {
    if (userOrganization) {
      loadWorkspaces();
    }
  }, [userOrganization]);

  const loadWorkspaces = async () => {
    if (!userOrganization) return;
    setIsLoading(true);
    try {
      const ws = await getWorkspaces(userOrganization.id);
      setWorkspaces(ws);
      
      // Load members for each workspace
      const membersMap = {};
      for (const workspace of ws) {
        const members = await getWorkspaceMembers(workspace.id);
        membersMap[workspace.id] = members;
      }
      setWorkspaceMembers(membersMap);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      setError('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!currentUser || !userOrganization) return;

    setIsSaving(true);
    setError('');

    try {
      // Check workspace limit
      if (!canCreateWorkspace(userOrganization, workspaces.length)) {
        const limit = getWorkspaceLimit(userOrganization);
        setError(
          limit === null
            ? 'Unable to create workspace'
            : `Workspace limit reached (${limit} workspaces). Please upgrade your plan.`
        );
        setIsSaving(false);
        return;
      }

      const result = await createWorkspace(formData, currentUser.uid, userOrganization.id);
      if (result.success) {
        setFormData({ name: '', description: '' });
        setShowCreateForm(false);
        await loadWorkspaces();
        await refreshUserProfile();
      } else {
        setError(result.error || 'Failed to create workspace');
      }
    } catch (err) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!currentUser || !editingWorkspace) return;

    setIsSaving(true);
    setError('');

    try {
      const result = await updateWorkspace(editingWorkspace.id, formData, currentUser.uid);
      if (result.success) {
        setEditingWorkspace(null);
        setFormData({ name: '', description: '' });
        await loadWorkspaces();
      } else {
        setError(result.error || 'Failed to update workspace');
      }
    } catch (err) {
      setError(err.message || 'Failed to update workspace');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (workspaceId) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteWorkspace(workspaceId, currentUser.uid);
      if (result.success) {
        await loadWorkspaces();
        await refreshUserProfile();
      } else {
        setError(result.error || 'Failed to delete workspace');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete workspace');
    }
  };

  const handleEdit = (workspace) => {
    setEditingWorkspace(workspace);
    setFormData({ name: workspace.name, description: workspace.description || '' });
    setShowCreateForm(false);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingWorkspace(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  const workspaceLimit = userOrganization ? getWorkspaceLimit(userOrganization) : 1;
  const canCreate = userOrganization ? canCreateWorkspace(userOrganization, workspaces.length) : false;

  if (isLoading) {
    return <div className="text-muted-foreground">Loading workspaces...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workspaces</h2>
          <p className="text-muted-foreground">
            {workspaces.length} / {workspaceLimit === null ? 'Unlimited' : workspaceLimit} workspaces
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {(showCreateForm || editingWorkspace) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}</CardTitle>
            <CardDescription>
              {editingWorkspace
                ? 'Update workspace details'
                : 'Create a new workspace to organize your projects and sessions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingWorkspace ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Workspace Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Workspace"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Workspace description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingWorkspace ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <Card key={workspace.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {workspace.name}
                  </CardTitle>
                  {workspace.description && (
                    <CardDescription className="mt-1">{workspace.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(workspace)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(workspace.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>
                  {workspaceMembers[workspace.id]?.length || 0} member
                  {(workspaceMembers[workspace.id]?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workspaces.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workspace to organize your projects and sessions
            </p>
            {canCreate && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkspaceManagement;

