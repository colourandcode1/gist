import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Mail, Shield, Eye, Edit, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTeamMembers,
  getPendingInvitations,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
  createTeam,
  updateTeamSettings,
  getUserTeams
} from '@/lib/firestoreUtils';

const TeamManagement = () => {
  const { currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('researcher');
  const [teamId, setTeamId] = useState(null);
  const [teamSettings, setTeamSettings] = useState({
    name: 'My Team',
    defaultRole: 'researcher'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      loadTeamData();
    } else {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  const loadTeamData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      // Get user's teams (for now, use first team or create one)
      const teams = await getUserTeams(currentUser.uid);
      let currentTeamId = teamId;

      if (teams.length === 0) {
        // Create a default team for the user
        const result = await createTeam({ name: 'My Team' }, currentUser.uid);
        if (result.success) {
          currentTeamId = result.id;
          setTeamId(currentTeamId);
        }
      } else {
        currentTeamId = teams[0].id;
        setTeamId(currentTeamId);
        setTeamSettings({
          name: teams[0].name || 'My Team',
          defaultRole: teams[0].defaultRole || 'researcher'
        });
      }

      if (currentTeamId) {
        const members = await getTeamMembers(currentTeamId, currentUser.uid);
        setTeamMembers(members);
        
        const invitations = await getPendingInvitations(currentTeamId, currentUser.uid);
        setPendingInvitations(invitations);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      setMessage({ type: 'error', text: 'Failed to load team data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    if (!teamId) {
      setMessage({ type: 'error', text: 'No team selected' });
      return;
    }

    setMessage({ type: '', text: '' });
    const result = await inviteTeamMember(teamId, inviteEmail, inviteRole, currentUser.uid);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Invitation sent successfully' });
      setShowInviteForm(false);
      setInviteEmail('');
      // Reload invitations
      const invitations = await getPendingInvitations(teamId, currentUser.uid);
      setPendingInvitations(invitations);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    if (!teamId) return;
    
    const result = await updateMemberRole(teamId, memberId, newRole, currentUser.uid);
    if (result.success) {
      setMessage({ type: 'success', text: 'Role updated successfully' });
      // Reload team members
      const members = await getTeamMembers(teamId, currentUser.uid);
      setTeamMembers(members);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update role' });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    if (!teamId) return;

    const result = await removeTeamMember(teamId, memberId, currentUser.uid);
    if (result.success) {
      setMessage({ type: 'success', text: 'Member removed successfully' });
      // Reload team members
      const members = await getTeamMembers(teamId, currentUser.uid);
      setTeamMembers(members);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove member' });
    }
  };

  const handleSaveTeamSettings = async () => {
    if (!teamId) return;

    const result = await updateTeamSettings(teamId, teamSettings, currentUser.uid);
    if (result.success) {
      setMessage({ type: 'success', text: 'Team settings saved successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save team settings' });
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Admin', variant: 'default', icon: Shield },
      researcher: { label: 'Researcher', variant: 'secondary', icon: Edit },
      viewer: { label: 'Viewer', variant: 'outline', icon: Eye }
    };
    const config = roleConfig[role] || roleConfig.researcher;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Settings
          </CardTitle>
          <CardDescription>Manage your team name and default permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Name</label>
            <Input
              placeholder="Your Team Name"
              value={teamSettings.name}
              onChange={(e) => setTeamSettings({ ...teamSettings, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Role for New Members</label>
            <select
              value={teamSettings.defaultRole}
              onChange={(e) => setTeamSettings({ ...teamSettings, defaultRole: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="researcher">Researcher</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <Button onClick={handleSaveTeamSettings}>Save Team Settings</Button>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage team member roles and permissions</CardDescription>
            </div>
            <Button onClick={() => setShowInviteForm(!showInviteForm)} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showInviteForm && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="researcher">Researcher</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteMember}>Send Invitation</Button>
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.email?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.displayName || member.email}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                    {getRoleBadge(member.role)}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="researcher">Researcher</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {member.id !== currentUser?.uid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations waiting for acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(invitation.role)}
                    <Button variant="ghost" size="icon">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

