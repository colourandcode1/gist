import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createComment, createActivity } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const CommentForm = ({ themeId, insightId = null, onCommentAdded, onCancel }) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const result = await createComment(
        {
          themeId,
          insightId,
          content: content.trim()
        },
        currentUser.uid
      );

      if (result.success) {
        // Track activity
        await createActivity(
          {
            type: 'comment',
            themeId,
            insightId,
            commentId: result.id,
            description: `${currentUser.email?.split('@')[0] || 'User'} added a comment`,
            metadata: {}
          },
          currentUser.uid
        );

        setContent('');
        if (onCommentAdded) {
          onCommentAdded();
        }
      } else {
        alert(`Failed to create comment: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Failed to create comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Basic @mention detection (simple implementation)
  const handleKeyDown = (e) => {
    // Allow @ symbol for mentions (basic support)
    // Full @mention implementation would require more complex logic
    if (e.key === '@' && content.length > 0 && content[content.length - 1] !== ' ') {
      // Could trigger mention autocomplete here
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment... (Use @ to mention someone)"
        rows={3}
        className="resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!content.trim() || isSubmitting}>
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;

