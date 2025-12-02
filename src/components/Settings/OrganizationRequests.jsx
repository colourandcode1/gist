import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { getPendingRequests, approveRequest, rejectRequest } from '@/lib/firestore/organizationRequests';
import { Check, X, Clock, Mail, Calendar } from 'lucide-react';

const OrganizationRequests = ({ onRequestProcessed }) => {
  const { currentUser, userOrganization, refreshUserProfile } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (userOrganization && currentUser) {
      loadPendingRequests();
    } else {
      setIsLoading(false);
    }
  }, [userOrganization, currentUser]);

  const loadPendingRequests = async () => {
    if (!userOrganization || !currentUser) return;
    
    setIsLoading(true);
    try {
      const requests = await getPendingRequests(userOrganization.id, currentUser.uid);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setMessage({ type: 'error', text: 'Failed to load join requests' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!currentUser) return;
    
    setProcessingId(requestId);
    setMessage({ type: '', text: '' });

    try {
      const result = await approveRequest(requestId, currentUser.uid);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Join request approved successfully' });
        await loadPendingRequests();
        // Refresh user profile to update member list
        await refreshUserProfile();
        // Notify parent component to update request count
        if (onRequestProcessed) {
          onRequestProcessed();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to approve request' });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to approve request' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!currentUser) return;
    
    if (!window.confirm('Are you sure you want to reject this join request?')) return;
    
    setProcessingId(requestId);
    setMessage({ type: '', text: '' });

    try {
      const result = await rejectRequest(requestId, currentUser.uid);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Join request rejected' });
        await loadPendingRequests();
        // Notify parent component to update request count
        if (onRequestProcessed) {
          onRequestProcessed();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reject request' });
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to reject request' });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading join requests...</p>
        </div>
      </div>
    );
  }

  if (!userOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You need to be part of an organization to manage join requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Join Requests
          </CardTitle>
          <CardDescription>
            Review and approve or reject requests to join your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending join requests</p>
              <p className="text-sm mt-1">Users who request to join will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {request.userEmail?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{request.userEmail}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>Requested {formatDate(request.requestedAt)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
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
          'bg-muted text-foreground'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default OrganizationRequests;

