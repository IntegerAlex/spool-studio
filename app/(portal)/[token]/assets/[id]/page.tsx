"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle, Image as ImageIcon, XCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PortalUser {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface PortalAssetDetail {
  id: string
  title: string
  type: string
  status: string
  thumbnail_url: string | null
  drive_file_url: string | null
  mime_type: string | null
  created_at: string
  updated_at: string
  scheduled_at?: string | null
  publish_date?: string | null
  published_at?: string | null
  approved_at?: string | null
}

interface PortalComment {
  id: string
  comment: string
  created_at: string
  user: PortalUser | null
}

interface PortalRevision {
  id: string
  version_number: number
  uploaded_at: string
  drive_file_url: string | null
  user: PortalUser | null
}

interface PortalClient {
  id: string
  name: string
  slug: string
  instagram_handle: string | null
  brand_color: string | null
}

interface PortalDetailData {
  client: PortalClient
  asset: PortalAssetDetail
  comments: PortalComment[]
  revisions: PortalRevision[]
}

function statusLabel(status: string): string {
  switch (status) {
    case "uploaded":
      return "Ready"
    case "ready_for_review":
      return "Review"
    case "revision_requested":
      return "Revision"
    case "approved":
      return "Approved"
    default:
      return status
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "revision_requested":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "ready_for_review":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

export default function PortalAssetDetailPage() {
  // SAFETY: route params are always non-empty strings for this dynamic segment.
  const params = useParams()
  // SAFETY: useParams returns string | string[] | undefined; for this route it is a single string.
  const token = params?.token as string
  // SAFETY: useParams returns string | string[] | undefined; for this route it is a single string.
  const assetId = params?.id as string

  const queryClient = useQueryClient()
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["portal-asset", token, assetId],
    enabled: Boolean(token) && Boolean(assetId),
    queryFn: async (): Promise<PortalDetailData> => {
      const res = await fetch(`/api/portal/${token}/assets/${assetId}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to load asset")
      }
      // SAFETY: the API returns the PortalDetailData shape; we trust the contract.
      return (await res.json()) as PortalDetailData
    },
  })

  const errorMessage =
    error instanceof Error ? error.message : "Failed to load asset"

  const handleDecision = async (
    decision: "approved" | "revision_requested",
  ) => {
    if (!data || !token) return
    setDecisionLoading(true)
    setDecisionError(null)
    try {
      const res = await fetch(
        `/api/portal/${token}/assets/${assetId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      )
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to submit decision")
      }
      queryClient.setQueryData<PortalDetailData>(
        ["portal-asset", token, assetId],
        (prev) =>
          prev ? { ...prev, asset: { ...prev.asset, status: decision } } : prev,
      )
    } catch (err) {
      setDecisionError(
        err instanceof Error ? err.message : "Failed to submit decision",
      )
    } finally {
      setDecisionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading asset...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/portal/${token}`}>Back to portal</Link>
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { client, asset, comments, revisions } = data
  const previewUrl = asset.drive_file_url || asset.thumbnail_url

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/portal/${token}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {client.name}
          </h1>
          <p className="text-sm text-muted-foreground">{asset.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden border-border bg-card">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={asset.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
              )}
            </div>
          </Card>

          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Comments
            </h3>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comments yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {c.user?.full_name ?? "Client"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={statusColor(asset.status)}
              >
                {statusLabel(asset.status)}
              </Badge>
              <span className="text-xs capitalize text-muted-foreground">
                {asset.type}
              </span>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">
                  {formatDate(asset.created_at)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="text-foreground">
                  {formatDate(asset.updated_at)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Scheduled</dt>
                <dd className="text-foreground">
                  {formatDate(asset.scheduled_at)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Published</dt>
                <dd className="text-foreground">
                  {formatDate(asset.published_at ?? asset.publish_date ?? null)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="text-foreground">
                  {formatDate(asset.approved_at)}
                </dd>
              </div>
            </dl>

            {decisionError && (
              <p className="text-sm text-destructive">{decisionError}</p>
            )}

            {asset.status !== "approved" && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400"
                  disabled={decisionLoading}
                  onClick={() => void handleDecision("revision_requested")}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Request Revision
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={decisionLoading}
                  onClick={() => void handleDecision("approved")}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}
          </Card>

          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Revisions
            </h3>
            {revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No revisions yet.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        v{r.version_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.user?.full_name ?? "Unknown"} ·{" "}
                        {formatDate(r.uploaded_at)}
                      </p>
                    </div>
                    {r.drive_file_url && (
                      <a
                        href={r.drive_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
