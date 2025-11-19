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
import { 
  getSeatUsage, 
  hasAvailableResearcherSeats,
  hasAvailableContributorSeats
} from '@/lib/subscriptionUtils';
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
  const [inviteRole, setInviteRole] = useState(ROLES.CONTRIBUTOR);
  const [inviteSeatType, setInviteSeatType] = useState('contributor');
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

  // Helper function to count admin members
  const getAdminCount = (members) => {
    return members.filter(m => m.role === ROLES.ADMIN).length;
  };

  const handleUpdateRole = async (memberId, newRole, newSeatType) => {
    if (!userOrganization || !canManageTeam(userProfile?.role)) return;
    
    setIsProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      // Check seat limits before updating
      const currentMember = organizationMembers.find(m => m.id === memberId);
      if (!currentMember) {
        setMessage({ type: 'error', text: 'Member not found' });
        setIsProcessing(false);
        return;
      }

      // Check if trying to change last admin to non-admin role
      const adminCount = getAdminCount(organizationMembers);
      if (currentMember.role === ROLES.ADMIN && newRole !== ROLES.ADMIN && adminCount === 1) {
        setMessage({ 
          type: 'error', 
          text: 'Cannot change the last admin to a different role. Please assign another admin first.' 
        });
        setIsProcessing(false);
        return;
      }

      // If changing to researcher, check if seats are available
      if (newSeatType === 'researcher' && currentMember.seatType !== 'researcher') {
        if (!hasAvailableResearcherSeats(userOrganization)) {
          setMessage({ 
            type: 'error', 
            text: 'No available researcher seats. Please upgrade your plan or remove a researcher.' 
          });
          setIsProcessing(false);
          return;
        }
      }

      // Update user role and seat type
      const userRef = doc(db, 'users', memberId);
      await updateDoc(userRef, {
        role: newRole,
        seatType: newSeatType,
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

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;
    if (!userOrganization || !canManageTeam(userProfile?.role)) return;

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
      if (memberToRemove.role === ROLES.ADMIN && adminCount === 1) {
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

  const getRoleBadge = (role, seatType) => {
    const roleConfig = {
      [ROLES.ADMIN]: { label: 'Admin', variant: 'default', icon: Shield },
      [ROLES.RESEARCHER]: { label: 'Researcher', variant: 'secondary', icon: Edit },
      [ROLES.CONTRIBUTOR]: { label: 'Contributor', variant: 'outline', icon: Eye },
      [ROLES.VIEWER]: { label: 'Viewer', variant: 'outline', icon: Eye }
    };
    const config = roleConfig[role] || roleConfig[ROLES.CONTRIBUTOR];
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
        {seatType && (
          <Badge variant="outline" className="text-xs">
            {seatType === 'researcher' ? 'Researcher Seat' : 'Contributor Seat'}
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

  if (!canManageTeam(userProfile?.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Only administrators can manage team members.</p>
      </div>
    );
  }

  const seatUsage = getSeatUsage(userOrganization);
  const tierConfig = TIER_CONFIG[userOrganization.tier] || TIER_CONFIG[TIERS.STARTER];
  const canAddResearcher = hasAvailableResearcherSeats(userOrganization);
  const canAddContributor = hasAvailableContributorSeats(userOrganization, seatUsage.contributorSeatsUsed);

  return (
    <div className="space-y-6">
      {/* Seat Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Seat Usage
          </CardTitle>
          <CardDescription>Current seat usage and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Researcher Seats</div>
              <div className="text-sm text-muted-foreground">
                {seatUsage.researcherSeatsUsed} / {seatUsage.researcherSeatsIncluded === null ? 'Unlimited' : seatUsage.researcherSeatsIncluded}
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ 
                  width: seatUsage.researcherSeatsIncluded === null 
                    ? '100%' 
                    : `${Math.min(100, (seatUsage.researcherSeatsUsed / seatUsage.researcherSeatsIncluded) * 100)}%` 
                }}
              />
            </div>
            {!canAddResearcher && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Researcher seat limit reached. Upgrade your plan to add more researchers.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Contributor Seats</div>
              <div className="text-sm text-muted-foreground">
                {seatUsage.contributorSeatsUsed} / {seatUsage.contributorSeatsUnlimited ? 'Unlimited' : 'Unlimited (billed)'}
              </div>
            </div>
            {seatUsage.contributorSeatsUnlimited ? (
              <p className="text-xs text-muted-foreground">Unlimited contributors included</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                ${tierConfig.contributorSeatPrice}/month per contributor
              </p>
            )}
          </div>

          {seatUsage.researcherSeatsUsed > seatUsage.researcherSeatsIncluded && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You are using {seatUsage.researcherSeatsUsed - seatUsage.researcherSeatsIncluded} additional researcher seat(s) at ${tierConfig.researcherSeatPrice}/month each.
              </p>
            </div>
          )}
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
              <CardDescription>Manage team member roles and seat types</CardDescription>
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
                  <option value={ROLES.RESEARCHER}>Researcher</option>
                  <option value={ROLES.CONTRIBUTOR}>Contributor</option>
                  <option value={ROLES.VIEWER}>Viewer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seat Type</label>
                <select
                  value={inviteSeatType}
                  onChange={(e) => setInviteSeatType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  disabled={inviteRole === ROLES.VIEWER}
                >
                  <option value="researcher">Researcher Seat</option>
                  <option value="contributor">Contributor Seat</option>
                </select>
                {inviteRole === ROLES.VIEWER && (
                  <p className="text-xs text-muted-foreground">Viewers do not consume seats</p>
                )}
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
                    {getRoleBadge(member.role, member.seatType)}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        // Auto-set seat type based on role
                        let newSeatType = member.seatType;
                        if (newRole === ROLES.VIEWER) {
                          newSeatType = null; // Viewers don't consume seats
                        } else if (newRole === ROLES.RESEARCHER && member.seatType !== 'researcher') {
                          newSeatType = 'researcher';
                        } else if (newRole === ROLES.CONTRIBUTOR && member.seatType === 'researcher') {
                          newSeatType = 'contributor';
                        }
                        handleUpdateRole(member.id, newRole, newSeatType);
                      }}
                      className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      disabled={isProcessing || member.id === currentUser?.uid}
                    >
                      <option value={ROLES.ADMIN}>Admin</option>
                      <option value={ROLES.RESEARCHER}>Researcher</option>
                      <option value={ROLES.CONTRIBUTOR}>Contributor</option>
                      <option value={ROLES.VIEWER}>Viewer</option>
                    </select>
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
