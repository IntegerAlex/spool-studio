'use client';

import { Comment } from '@/types/index';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usersApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { User } from '@/types/index';
import { MessageCircle } from 'lucide-react';

interface CommentsThreadProps {
  comments: Comment[];
  onAddComment: (content: string, isInternal: boolean) => void;
  isLoading?: boolean;
}

export function CommentsThread({ comments, onAddComment, isLoading }: CommentsThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await usersApi.getAll();
      const userMap = new Map(allUsers.map((u) => [u.id, u]));
      setUsers(userMap);
    };

    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment, isInternal);
      setNewComment('');
      setIsInternal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUser = (userId: string) => {
    return users.get(userId) || { id: userId, name: 'Unknown', email: 'unknown@example.com', role: 'designer' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Comments ({comments.length})</h3>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => {
          const author = getUser(comment.authorId);
          return (
            <div key={comment.id} className={`p-4 border rounded-lg ${
              comment.isInternal
                ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                : 'bg-muted border-border'
            }`}>
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={author.avatar} alt={author.name} />
                  <AvatarFallback>{author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{author.name}</p>
                    {comment.isInternal && (
                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded">
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-border">
        <div>
          <textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-border bg-background cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">Internal note</span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
