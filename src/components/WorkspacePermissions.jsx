import React, { useState, useEffect } from 'react';
import { Save, Shield, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  getWorkspacePermissions,
  setWorkspacePermissions,
  getWorkspaceMembers,
} from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';
import { TIER_CONFIG, TIERS } from '@/lib/pricingConstants';

const WorkspacePermissions = ({ workspaceId }) => {
  const { userOrganization, currentUser } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (workspaceId) {
      loadPermissions();
      loadMembers();
    }
  }, [workspaceId]);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const perms = await getWorkspacePermissions(workspaceId);
      setPermissions(perms || {
        // Default permissions structure
        allowAllMembers: true,
        allowedRoles: ['admin', 'researcher', 'contributor', 'viewer'],
        allowedUsers: [],
        restrictedActions: [],
      });
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load workspace permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const mems = await getWorkspaceMembers(workspaceId);
      setMembers(mems);
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  const handleSave = async () => {
    if (!workspaceId || !currentUser) return;

    setIsSaving(true);
    setError('');

    try {
      const result = await setWorkspacePermissions(workspaceId, permissions, currentUser.uid);
      if (result.success) {
        // Success - permissions saved
      } else {
        setError(result.error || 'Failed to save permissions');
      }
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePermission = (key, value) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleRole = (role) => {
    const allowedRoles = permissions?.allowedRoles || [];
    if (allowedRoles.includes(role)) {
      updatePermission('allowedRoles', allowedRoles.filter((r) => r !== role));
    } else {
      updatePermission('allowedRoles', [...allowedRoles, role]);
    }
  };

  // Check if Enterprise tier
  const isEnterprise = userOrganization?.tier === TIERS.ENTERPRISE;

  if (!isEnterprise) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Workspace Permissions</h3>
          <p className="text-muted-foreground">
            Workspace-level permissions are only available for Enterprise tier organizations.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading permissions...</div>;
  }

  const roles = ['admin', 'researcher', 'contributor', 'viewer'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Workspace Permissions
        </CardTitle>
        <CardDescription>
          Configure access controls for this workspace (Enterprise feature)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-all">Allow All Organization Members</Label>
              <p className="text-sm text-muted-foreground">
                If enabled, all organization members can access this workspace
              </p>
            </div>
            <Switch
              id="allow-all"
              checked={permissions?.allowAllMembers ?? true}
              onCheckedChange={(checked) => updatePermission('allowAllMembers', checked)}
            />
          </div>

          {!permissions?.allowAllMembers && (
            <div className="space-y-3 pl-4 border-l-2">
              <Label>Allowed Roles</Label>
              <p className="text-sm text-muted-foreground">
                Select which roles can access this workspace
              </p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge
                    key={role}
                    variant={permissions?.allowedRoles?.includes(role) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleRole(role)}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{members.length} member{members.length !== 1 ? 's' : ''} in this workspace</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspacePermissions;

