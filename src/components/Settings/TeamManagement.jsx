import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Mail, Shield, Eye, Edit, X, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrganizationMembers,
} from '@/lib/firestoreUtils';
import { 
  TIER_CONFIG,
  TIERS,
  ROLES
} from '@/lib/pricingConstants';
import { getTeamInfo } from '@/lib/subscriptionUtils';
import { canManageTeam } from '@/lib/permissions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

const TeamManagement = () => {
  const { currentUser, userOrganization, userProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.MEMBER);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (userOrganization) {
      loadOrganizationMembers();
    } else {
      setIsLoading(false);
    }
  }, [userOrganization]);

  const loadOrganizationMembers = async () => {
    if (!userOrganization) return;
    
    setIsLoading(true);
    try {
      const members = await getOrganizationMembers(userOrganization.id);
      setOrganizationMembers(members);
    } catch (error) {
      console.error('Error loading organization members:', error);
      setMessage({ type: 'error', text: 'Failed to load team members' });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to count admin members (Members with is_admin flag)
  const getAdminCount = (members) => {
    return members.filter(m => m.role === ROLES.MEMBER && m.is_admin === true).length;
  };

  const handleUpdateRole = async (memberId, newRole) => {
    if (!userOrganization || !canManageTeam(userProfile?.role, userProfile?.is_admin)) return;
    
    setIsProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const currentMember = organizationMembers.find(m => m.id === memberId);
      if (!currentMember) {
        setMessage({ type: 'error', text: 'Member not found' });
        setIsProcessing(false);
        return;
      }

      // Check if trying to change last admin to non-admin
      const adminCount = getAdminCount(organizationMembers);
      const isCurrentlyAdmin = currentMember.role === ROLES.MEMBER && currentMember.is_admin === true;
      const willBeAdmin = newRole === ROLES.MEMBER; // Admin toggle is handled separately
      
      if (isCurrentlyAdmin && !willBeAdmin && adminCount === 1) {
        setMessage({ 
          type: 'error', 
          text: 'Cannot remove admin status from the last admin. Please assign another admin first.' 
        });
        setIsProcessing(false);
        return;
      }

      // Update user role
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        role: newRole,
        // Clear is_admin if changing to viewer
        ...(newRole === ROLES.VIEWER ? { is_admin: false } : {}),
        updatedAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Member role updated successfully' });
      await loadOrganizationMembers();
      await refreshUserProfile();
    } catch (err) {
      console.error('Error updating member role:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update member role' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAdmin = async (memberId, isAdmin) => {
    if (!userOrganization || !canManageTeam(userProfile?.role, userProfile?.is_admin)) return;
    
    setIsProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const currentMember = organizationMembers.find(m => m.id === memberId);
      if (!currentMember) {
        setMessage({ type: 'error', text: 'Member not found' });
        setIsProcessing(false);
        return;
      }

      // Must be a Member to be an admin
      if (currentMember.role !== ROLES.MEMBER) {
        setMessage({ type: 'error', text: 'Only Members can be assigned admin status' });
        setIsProcessing(false);
        return;
      }

      // Check if trying to remove admin from last admin
      const adminCount = getAdminCount(organizationMembers);
      if (currentMember.is_admin === true && !isAdmin && adminCount === 1) {
        setMessage({ 
          type: 'error', 
          text: 'Cannot remove admin status from the last admin. Please assign another admin first.' 
        });
        setIsProcessing(false);
        return;
      }

      // Update is_admin flag
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        is_admin: isAdmin,
        updatedAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: `Admin status ${isAdmin ? 'granted' : 'removed'} successfully` });
      await loadOrganizationMembers();
      await refreshUserProfile();
    } catch (err) {
      console.error('Error updating admin status:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update admin status' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;
    if (!userOrganization || !canManageTeam(userProfile?.role, userProfile?.is_admin)) return;

    setIsProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      // Check if trying to remove the last admin
      const memberToRemove = organizationMembers.find(m => m.id === memberId);
      if (!memberToRemove) {
        setMessage({ type: 'error', text: 'Member not found' });
        setIsProcessing(false);
        return;
      }

      const adminCount = getAdminCount(organizationMembers);
      const isAdmin = memberToRemove.role === ROLES.MEMBER && memberToRemove.is_admin === true;
      if (isAdmin && adminCount === 1) {
        setMessage({ 
          type: 'error', 
          text: 'Cannot remove the last admin. Please assign another admin first.' 
        });
        setIsProcessing(false);
        return;
      }

      // Remove organizationId from user
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        organizationId: null,
        updatedAt: serverTimestamp()
      });

      setMessage({ type: 'success', text: 'Member removed successfully' });
      await loadOrganizationMembers();
      await refreshUserProfile();
    } catch (err) {
      console.error('Error removing member:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove member' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInviteMember = () => {
    // For now, redirect to a placeholder or show message
    // In a full implementation, this would send an invitation email
    setMessage({ 
      type: 'info', 
      text: 'Invitation feature coming soon. For now, users can join by signing up with your organization email domain.' 
    });
    setShowInviteForm(false);
  };

  const getRoleBadge = (role, isAdmin = false) => {
    const roleConfig = {
      [ROLES.MEMBER]: { label: 'Member', variant: 'secondary', icon: Edit },
      [ROLES.VIEWER]: { label: 'Viewer', variant: 'outline', icon: Eye }
    };
    const config = roleConfig[role] || roleConfig[ROLES.VIEWER];
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
        {isAdmin && role === ROLES.MEMBER && (
          <Badge variant="default" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (!userOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You need to be part of an organization to manage team members.</p>
      </div>
    );
  }

  if (!canManageTeam(userProfile?.role, userProfile?.is_admin)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Only administrators can manage team members.</p>
      </div>
    );
  }

  // Count members (excluding viewers) for team size
  const memberCount = organizationMembers.filter(m => m.role !== ROLES.VIEWER).length;
  const teamInfo = getTeamInfo(userOrganization, memberCount);

  return (
    <div className="space-y-6">
      {/* Team Size Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Team Size
          </CardTitle>
          <CardDescription>Current team size and tier information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Team Members</div>
              <div className="text-sm text-muted-foreground">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Current tier: <span className="font-medium">{teamInfo.tierConfig.name}</span> ({teamInfo.tierConfig.teamSizeRange || 'N/A'})
            </div>
            {teamInfo.shouldUpgrade && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-primary mb-1">Recommended Tier Update</div>
                    <div className="text-muted-foreground">
                      Your team size ({memberCount} members) is better suited for the <span className="font-medium">{TIER_CONFIG[teamInfo.recommendedTier].name}</span> tier.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Organization Members
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
                  <option value={ROLES.MEMBER}>Member</option>
                  <option value={ROLES.VIEWER}>Viewer</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Members can create content. Viewers can only view content.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteMember} disabled={isProcessing}>
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {organizationMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No organization members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {organizationMembers.map((member) => (
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
                    {getRoleBadge(member.role, member.is_admin)}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      disabled={isProcessing || member.id === currentUser?.uid}
                    >
                      <option value={ROLES.MEMBER}>Member</option>
                      <option value={ROLES.VIEWER}>Viewer</option>
                    </select>
                    {member.role === ROLES.MEMBER && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.is_admin === true}
                          onChange={(e) => handleToggleAdmin(member.id, e.target.checked)}
                          disabled={isProcessing || member.id === currentUser?.uid}
                          className="rounded border-gray-300"
                        />
                        <span className="text-muted-foreground">Admin</span>
                      </label>
                    )}
                    {member.id !== currentUser?.uid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={isProcessing}
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

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          message.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
          'bg-muted text-foreground'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

