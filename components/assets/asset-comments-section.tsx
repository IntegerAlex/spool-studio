"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { CommentsThread } from "@/components/assets/comments-thread"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { commentsApi } from "@/lib/api-client"
import type { AssetComment, User } from "@/types/index"

const PAGE_SIZE = 30

type CommentsPage = Awaited<ReturnType<typeof commentsApi.getThread>>

interface AssetCommentsSectionProps {
  assetId: string
}

export function AssetCommentsSection({ assetId }: AssetCommentsSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sectionRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
          }
        })
      },
      { rootMargin: "200px" },
    )

    observer.observe(sectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  const commentsQuery = useInfiniteQuery({
    queryKey: ["comments", assetId],
    enabled: visible,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      try {
        return await commentsApi.getThread(assetId, {
          limit: PAGE_SIZE,
          offset: pageParam,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load comments"
        toast({
          title: "Comments failed",
          description: message,
          variant: "destructive",
        })
        throw err
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages): number | undefined =>
      lastPage.comments.length >= PAGE_SIZE
        ? allPages.length * PAGE_SIZE
        : undefined,
  })

  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.comments) ?? [],
    [commentsQuery.data],
  )

  const users = useMemo(() => {
    const map = new Map<string, User>()
    commentsQuery.data?.pages.forEach((page) => {
      page.users.forEach((user) => map.set(user.id, user))
    })
    return map
  }, [commentsQuery.data])

  const hasMore = commentsQuery.hasNextPage

  const addCommentMutation = useMutation({
    mutationFn: async (input: { message: string; isInternal: boolean }) =>
      commentsApi.create(assetId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["comments", assetId] })

      const previous =
        queryClient.getQueryData<{
          pages: CommentsPage[]
          pageParams: unknown[]
        }>(["comments", assetId])

      const optimisticComment: AssetComment = {
        id: `optimistic-${Date.now()}`,
        assetId,
        userId: "me",
        type: input.isInternal ? "internal_note" : "comment",
        message: input.message,
        revisionStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isInternal: input.isInternal,
      }

      queryClient.setQueryData<{
        pages: CommentsPage[]
        pageParams: unknown[]
      }>(["comments", assetId], (old) => {
        if (!old || old.pages.length === 0) {
          return old
        }
        const pages = [...old.pages]
        const lastIndex = pages.length - 1
        pages[lastIndex] = {
          ...pages[lastIndex],
          comments: [...pages[lastIndex].comments, optimisticComment],
        }
        return { ...old, pages }
      })

      return { previous }
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["comments", assetId], context.previous)
      }
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add comment"
      toast({
        title: "Failed to add comment",
        description: errorMessage,
        variant: "destructive",
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", assetId] })
    },
  })

  const handleAddComment = async (content: string, isInternal: boolean) => {
    const message = content.trim()
    if (!message) {
      return
    }

    await addCommentMutation.mutateAsync({ message, isInternal })
  }

  return (
    <div ref={sectionRef}>
      <CommentsThread
        comments={comments}
        onAddComment={handleAddComment}
        isLoading={commentsQuery.isLoading}
        users={users}
      />
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            className="border-border"
            onClick={() => void commentsQuery.fetchNextPage()}
            disabled={commentsQuery.isFetchingNextPage}
          >
            {commentsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
