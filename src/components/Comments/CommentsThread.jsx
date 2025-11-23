import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle2, Circle, Edit, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import CommentForm from './CommentForm';
import { getComments, updateComment, deleteComment } from '@/lib/firestoreUtils';
import { getUserProfile } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const CommentsThread = ({ themeId, insightId = null }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (themeId) {
      loadComments();
    }
  }, [themeId, insightId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const commentsData = await getComments(themeId, insightId);
      setComments(commentsData);

      // Load user profiles for all comment authors
      const userIds = [...new Set(commentsData.map(c => c.userId))];
      const profiles = {};
      for (const userId of userIds) {
        const profile = await getUserProfile(userId);
        if (profile) {
          profiles[userId] = profile;
        }
      }
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (commentId, resolved) => {
    if (!currentUser) return;

    try {
      const result = await updateComment(commentId, { resolved: !resolved }, currentUser.uid);
      if (result.success) {
        await loadComments();
      } else {
        alert(`Failed to update comment: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  const handleDelete = async (commentId) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const result = await deleteComment(commentId, currentUser.uid);
      if (result.success) {
        await loadComments();
      } else {
        alert(`Failed to delete comment: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId) => {
    if (!currentUser || !editContent.trim()) return;

    try {
      const result = await updateComment(commentId, { content: editContent.trim() }, currentUser.uid);
      if (result.success) {
        setEditingCommentId(null);
        setEditContent('');
        await loadComments();
      } else {
        alert(`Failed to update comment: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserDisplayName = (userId) => {
    const profile = userProfiles[userId];
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return userId.substring(0, 8);
  };

  const getUserInitials = (userId) => {
    const profile = userProfiles[userId];
    if (profile?.email) {
      const parts = profile.email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return profile.email.substring(0, 2).toUpperCase();
    }
    return userId.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {showForm ? (
        <Card>
          <CardContent className="pt-6">
            <CommentForm
              themeId={themeId}
              insightId={insightId}
              onCommentAdded={() => {
                setShowForm(false);
                loadComments();
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          Add a comment
        </Button>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isAuthor = comment.userId === currentUser?.uid;
            const isEditing = editingCommentId === comment.id;

            return (
              <Card key={comment.id} className={comment.resolved ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(comment.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(comment.userId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.resolved && (
                          <Badge variant="secondary" className="text-xs">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(comment.id)}
                              disabled={!editContent.trim()}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      )}
                      {!isEditing && (
                        <div className="flex items-center gap-2 mt-2">
                          {isAuthor && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(comment)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(comment.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </>
                          )}
                          {isAuthor && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResolve(comment.id, comment.resolved)}
                            >
                              {comment.resolved ? (
                                <>
                                  <Circle className="w-3 h-3 mr-1" />
                                  Unresolve
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Mark Resolved
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentsThread;

