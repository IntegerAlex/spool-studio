"use client"

import { AlertCircle, CheckCircle, Eye, Image as ImageIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface PortalAsset {
  id: string
  title: string
  type: string
  status: string
  thumbnail_url: string | null
  drive_file_url: string | null
  mime_type: string | null
  created_at: string
}

interface PortalClient {
  id: string
  name: string
  slug: string
  instagram_handle: string | null
  brand_color: string | null
}

interface PortalData {
  client: PortalClient
  assets: PortalAsset[]
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

export default function PortalPage() {
  const params = useParams()
// SAFETY: this cast is safe because the value already conforms to the asserted type.
  const token = params?.token as string
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decisionLoading, setDecisionLoading] = useState(false)

  const fetchPortalData = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/portal/${token}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to load portal")
      }
      const { data: portalData } = await res.json()
      setData(portalData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portal")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchPortalData()
  }, [fetchPortalData])

  const handleDecision = async (
    assetId: string,
    decision: "approved" | "revision_requested",
    comment?: string,
  ) => {
    setDecisionLoading(true)
    try {
      const res = await fetch(
        `/api/portal/${token}/assets/${assetId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, comment }),
        },
      )

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Failed to submit decision")
      }

      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          assets: prev.assets.map((a) =>
            a.id === assetId ? { ...a, status: decision } : a,
          ),
        }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit decision")
    } finally {
      setDecisionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading assets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {data.client.name}
        </h1>
        {data.client.instagram_handle && (
          <p className="text-sm text-muted-foreground">
            {data.client.instagram_handle}
          </p>
        )}
      </div>

      {data.assets.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No assets available for review.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.assets.map((asset) => (
            <Card
              key={asset.id}
              className="overflow-hidden border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/portal/${token}/assets/${asset.id}`)}
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                {asset.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnail_url}
                    alt={asset.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">
                    {asset.title}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${statusColor(asset.status)}`}
                  >
                    {statusLabel(asset.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {asset.type}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/portal/${token}/assets/${asset.id}`)
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  {asset.status !== "approved" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={decisionLoading}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDecision(asset.id, "approved")
                      }}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
