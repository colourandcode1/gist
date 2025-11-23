// Firestore utility functions for teams
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { getUserProfile } from './users';

// Get team members for a team
export const getTeamMembers = async (teamId, userId) => {
  try {
    if (!teamId || !userId) {
      return [];
    }

    // Get team document to check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return [];
    }

    const teamData = teamSnap.data();
    // Check if user is a member of the team
    if (!teamData.members?.includes(userId) && teamData.ownerId !== userId) {
      return [];
    }

    // Get team members from teamMembers subcollection or members array
    const membersQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId)
    );

    const membersSnapshot = await getDocs(membersQuery);
    const members = [];

    membersSnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role || 'member',
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || data.joinedAt
      });
    });

    // If no subcollection members, use members array from team document
    if (members.length === 0 && teamData.members) {
      // Fetch user profiles for each member
      for (const memberId of teamData.members) {
        const userProfile = await getUserProfile(memberId);
        if (userProfile) {
          members.push({
            id: memberId,
            userId: memberId,
            email: userProfile.email,
            displayName: userProfile.displayName,
            role: teamData.roles?.[memberId] || 'researcher'
          });
        }
      }
    }

    return members;
  } catch (error) {
    console.error('Error loading team members:', error);
    return [];
  }
};

// Invite a team member
export const inviteTeamMember = async (teamId, email, role, userId) => {
  try {
    if (!teamId || !email || !userId) {
      return { success: false, error: 'Team ID, email, and user ID are required' };
    }

    // Check if user has permission to invite (must be team owner or admin)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can invite members' };
    }

    // Create invitation document
    const invitationPayload = {
      teamId,
      email,
      role: role || 'member',
      invitedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: null // Could add expiration logic
    };

    const docRef = await addDoc(collection(db, 'teamInvitations'), invitationPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error inviting team member:', error);
    return { success: false, error: error.message };
  }
};

// Get pending invitations for a team
export const getPendingInvitations = async (teamId, userId) => {
  try {
    if (!teamId || !userId) {
      return [];
    }

    // Check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return [];
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return [];
    }

    const q = query(
      collection(db, 'teamInvitations'),
      where('teamId', '==', teamId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const invitations = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
      });
    });

    return invitations;
  } catch (error) {
    console.error('Error loading pending invitations:', error);
    return [];
  }
};

// Update team member role
export const updateMemberRole = async (teamId, memberId, newRole, userId) => {
  try {
    if (!teamId || !memberId || !userId) {
      return { success: false, error: 'Team ID, member ID, and user ID are required' };
    }

    // Check permissions (only admin or owner can update roles)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can update roles' };
    }

    // Update role in teamMembers subcollection if it exists
    const memberQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId),
      where('userId', '==', memberId)
    );

    const memberSnapshot = await getDocs(memberQuery);
    if (!memberSnapshot.empty) {
      const memberDoc = memberSnapshot.docs[0];
      await updateDoc(doc(db, 'teamMembers', memberDoc.id), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } else {
      // Update in team document roles map
      const currentRoles = teamData.roles || {};
      await updateDoc(teamRef, {
        roles: { ...currentRoles, [memberId]: newRole },
        updatedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: error.message };
  }
};

// Remove team member
export const removeTeamMember = async (teamId, memberId, userId) => {
  try {
    if (!teamId || !memberId || !userId) {
      return { success: false, error: 'Team ID, member ID, and user ID are required' };
    }

    // Check permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can remove members' };
    }

    // Cannot remove owner
    if (teamData.ownerId === memberId) {
      return { success: false, error: 'Cannot remove team owner' };
    }

    // Remove from teamMembers subcollection
    const memberQuery = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId),
      where('userId', '==', memberId)
    );

    const memberSnapshot = await getDocs(memberQuery);
    if (!memberSnapshot.empty) {
      for (const memberDoc of memberSnapshot.docs) {
        await deleteDoc(doc(db, 'teamMembers', memberDoc.id));
      }
    }

    // Remove from team document members array and roles
    const currentMembers = teamData.members || [];
    const currentRoles = teamData.roles || {};
    const updatedMembers = currentMembers.filter(id => id !== memberId);
    const { [memberId]: removedRole, ...updatedRoles } = currentRoles;

    await updateDoc(teamRef, {
      members: updatedMembers,
      roles: updatedRoles,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return { success: false, error: error.message };
  }
};

// Create a team
export const createTeam = async (teamData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const teamPayload = {
      name: teamData.name || 'My Team',
      ownerId: userId,
      members: [userId], // Owner is first member
      roles: { [userId]: 'admin' },
      defaultRole: teamData.defaultRole || 'member',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'teams'), teamPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error: error.message };
  }
};

// Update team settings
export const updateTeamSettings = async (teamId, settings, userId) => {
  try {
    if (!teamId || !userId) {
      return { success: false, error: 'Team ID and user ID are required' };
    }

    // Check permissions (only admin or owner can update settings)
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return { success: false, error: 'Team not found' };
    }

    const teamData = teamSnap.data();
    const userRole = teamData.roles?.[userId] || (teamData.ownerId === userId ? 'admin' : 'member');
    
    if (userRole !== 'admin' && teamData.ownerId !== userId) {
      return { success: false, error: 'Permission denied - only admins can update team settings' };
    }

    const updateData = {
      updatedAt: serverTimestamp()
    };

    if (settings.name !== undefined) updateData.name = settings.name;
    if (settings.defaultRole !== undefined) updateData.defaultRole = settings.defaultRole;

    await updateDoc(teamRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating team settings:', error);
    return { success: false, error: error.message };
  }
};

// Get user's teams
export const getUserTeams = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    // Get teams where user is a member
    const q = query(
      collection(db, 'teams'),
      where('members', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const teams = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    return teams;
  } catch (error) {
    console.error('Error loading user teams:', error);
    return [];
  }
};
