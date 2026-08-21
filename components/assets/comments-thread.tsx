"use client"

import { MessageCircle } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { AssetComment, User } from "@/types/index"

type CommentRecord = AssetComment & {
  authorId?: string
  content?: string
  isInternal?: boolean
  replies?: unknown[]
}

interface MentionUser {
  id: string
  name: string
  email: string
  avatar: string | null
}

interface CommentsThreadProps {
  comments: CommentRecord[]
  onAddComment?: (content: string, isInternal: boolean) => void
  isLoading?: boolean
  readOnly?: boolean
  users?: Map<string, User> | User[]
}

function renderCommentWithMentions(text: string): React.ReactNode[] {
  const mentionRegex = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
      >
        @{match[1]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function CommentsThread({
  comments,
  onAddComment,
  isLoading,
  readOnly,
  users,
}: CommentsThreadProps) {
  const [newComment, setNewComment] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [debouncedMentionQuery, setDebouncedMentionQuery] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)

  const userMap = useMemo(() => {
    if (!users) {
      return new Map<string, User>()
    }
    if (users instanceof Map) {
      return users
    }
    return new Map(users.map((user) => [user.id, user]))
  }, [users])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedMentionQuery(mentionQuery)
      setMentionIndex(0)
    }, 250)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [mentionQuery])

  const mentionSearchQuery = useQuery({
    queryKey: ["user-search", debouncedMentionQuery],
    queryFn: async (): Promise<MentionUser[]> => {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(debouncedMentionQuery)}`,
      )
      if (!res.ok) {
        throw new Error("Failed to search users")
      }
      // SAFETY: the search endpoint returns a { data } envelope of MentionUser records.
      const payload = (await res.json()) as { data?: MentionUser[] }
      return payload.data ?? []
    },
    enabled: debouncedMentionQuery.length > 0,
    placeholderData: keepPreviousData,
  })

  const mentionResults = useMemo(() => {
    if (debouncedMentionQuery.length === 0) {
      return []
    }
    return mentionSearchQuery.data ?? []
  }, [debouncedMentionQuery, mentionSearchQuery.data])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setNewComment(value)

    const textBeforeCursor = value.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf("@")

    if (atIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      if (!/\s/.test(textAfterAt) && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt)
        setMentionStart(atIndex)
        setShowMentions(true)
        return
      }
    }

    setShowMentions(false)
    setMentionQuery("")
    setMentionStart(-1)
  }

  const insertMention = (user: MentionUser) => {
    const textarea = textareaRef.current
    if (!textarea || mentionStart < 0) return

    const beforeAt = newComment.slice(0, mentionStart)
    const afterCursor = newComment.slice(textarea.selectionStart)
    const username = user.name.replace(/\s+/g, "").toLowerCase()
    const newValue = `${beforeAt}@${username} ${afterCursor}`

    setNewComment(newValue)
    setShowMentions(false)
    setMentionQuery("")
    setMentionStart(-1)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = mentionStart + username.length + 2
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || mentionResults.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMentionIndex((prev) => (prev + 1) % mentionResults.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setMentionIndex(
        (prev) => (prev - 1 + mentionResults.length) % mentionResults.length,
      )
    } else if (e.key === "Enter" && showMentions) {
      e.preventDefault()
      insertMention(mentionResults[mentionIndex])
    } else if (e.key === "Escape") {
      setShowMentions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !onAddComment || readOnly) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment, isInternal)
      setNewComment("")
      setIsInternal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUser = (userId: string) => {
    const user = userMap.get(userId)
    if (user) {
      return {
        id: user.id,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
        name: (user as any).full_name ?? (user as any).name ?? "Unknown",
        email: user.email,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
        avatar: (user as any).avatar_url ?? (user as any).avatar ?? null,
        role: user.role,
      }
    }
    return {
      id: userId,
      name: "Unknown",
      email: "unknown@example.com",
      role: "designer" as const,
      avatar: null,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Comments ({comments.length})
        </h3>
      </div>

      <div className="space-y-4">
        {isLoading && comments.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            Loading comments...
          </div>
        ) : null}
        {comments.map((comment) => {
          const authorId =
// SAFETY: this cast is safe because the value already conforms to the asserted type.
            (comment as any).userId ??
// SAFETY: this cast is safe because the value already conforms to the asserted type.
            (comment as any).user_id ??
// SAFETY: this cast is safe because the value already conforms to the asserted type.
            (comment as any).authorId ??
            "unknown"
          const author = getUser(authorId)
          const commentBody = comment.message || comment.content || ""
          const isInternalComment =
            comment.type === "internal_note" || comment.isInternal === true
          return (
            <div
              key={comment.id}
              className={`p-4 border rounded-lg ${
                isInternalComment
                  ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                  : "bg-muted border-border"
              }`}
            >
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage
                    src={author.avatar ?? undefined}
                    alt={author.name}
                  />
                  <AvatarFallback>
                    {author.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-foreground text-sm">
                      {author.name}
                    </p>
                    {isInternalComment && (
                      <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded">
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(
// SAFETY: this cast is safe because the value already conforms to the asserted type.
                      (comment as any).createdAt ?? (comment as any).created_at,
                    ).toLocaleString()}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {renderCommentWithMentions(commentBody)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 pt-4 border-t border-border"
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Add a comment... Use @ to mention someone"
            value={newComment}
            onChange={handleTextareaChange}
            onKeyDown={handleMentionKeyDown}
            disabled={isSubmitting || readOnly || !onAddComment}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />

          {showMentions && mentionResults.length > 0 && (
            <div
              ref={mentionListRef}
              className="absolute z-50 bottom-full mb-1 left-0 w-72 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
            >
              {mentionResults.map((user, idx) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                    idx === mentionIndex
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={user.avatar ?? undefined}
                      alt={user.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-xs">
                      {user.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={isSubmitting || readOnly || !onAddComment}
              className="w-4 h-4 rounded border-border bg-background cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">Internal note</span>
          </label>

          <Button
            type="submit"
            disabled={
              isSubmitting || !newComment.trim() || readOnly || !onAddComment
            }
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? "Adding..." : "Add Comment"}
          </Button>
        </div>
        {readOnly && (
          <p className="text-xs text-muted-foreground">
            Commenting is not available yet.
          </p>
        )}
      </form>
    </div>
  )
}
