'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssetComment, User } from '@/types/index';
import { commentsApi } from '@/lib/api-client';
import { CommentsThread } from '@/components/assets/comments-thread';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 30;

interface AssetCommentsSectionProps {
  assetId: string;
}

export function AssetCommentsSection({ assetId }: AssetCommentsSectionProps) {
  const { toast } = useToast();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!sectionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const mergeUsers = (incoming: User[]) => {
    if (incoming.length === 0) {
      return;
    }

    setUsers((prev) => {
      const next = new Map(prev);
      incoming.forEach((user) => next.set(user.id, user));
      return next;
    });
  };

  const loadComments = async (nextOffset: number, reset = false) => {
    setIsLoading(true);
    try {
      const payload = await commentsApi.getThread(assetId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      mergeUsers(payload.users);

      setComments((prev) => (reset ? payload.comments : [...prev, ...payload.comments]));
      setOffset(nextOffset + payload.comments.length);
      setHasMore(payload.comments.length >= PAGE_SIZE);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load comments';
      toast({
        title: 'Comments failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    void loadComments(0, true);
  }, [visible]);

  const handleAddComment = async (content: string, isInternal: boolean) => {
    const message = content.trim();
    if (!message) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: AssetComment = {
      id: optimisticId,
      assetId,
      userId: 'me',
      type: isInternal ? 'internal_note' : 'comment',
      message,
      revisionStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isInternal,
    };

    setComments((prev) => [...prev, optimisticComment]);

    try {
      const created = await commentsApi.create(assetId, { message, isInternal });
      setComments((prev) => prev.map((entry) => (entry.id === optimisticId ? created : entry)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setComments((prev) => prev.filter((entry) => entry.id !== optimisticId));
      toast({
        title: 'Failed to add comment',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  return (
    <div ref={sectionRef}>
      <CommentsThread
        comments={comments}
        onAddComment={handleAddComment}
        isLoading={isLoading}
        users={users}
      />
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            className="border-border"
            onClick={() => loadComments(offset)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
