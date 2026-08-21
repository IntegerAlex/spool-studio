"use client"

import { Copy, MoreHorizontal, Upload } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AssetActivitySection } from "@/components/assets/asset-activity-section"
import { AssetCommentsSection } from "@/components/assets/asset-comments-section"
import { AssetFormDialog } from "@/components/assets/asset-form-dialog"
import { AssetPreviewMedia } from "@/components/assets/asset-preview-modal"
import { AssetRevisionsSection } from "@/components/assets/asset-revisions-section"
import { StatusBadge } from "@/components/assets/status-badge"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  assetsApi,
  authApi,
  clearApiClientCache,
  clientsApi,
  usersApi,
} from "@/lib/api-client"
import { getAssetIcon, getAssetPreviewType } from "@/lib/asset-display"
import { toAssetPreviewDescriptor } from "@/lib/asset-preview"
import {
  canUploadFromStatus,
  canUploadRevisionFromStatus,
  getRevisionEligibilityReason,
  getUploadEligibilityReason,
} from "@/lib/asset-workflow"
import type { Asset, User } from "@/types/index"

export default function AssetDetailPage() {
  const params = useParams()
// SAFETY: this cast is safe because the value already conforms to the asserted type.
  const assetId = params.id as string | undefined
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showDelete, setShowDelete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingRevision, setIsUploadingRevision] = useState(false)
  const [revisionUploadProgress, setRevisionUploadProgress] = useState(0)

  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null)
  const [workflowAction, setWorkflowAction] = useState<
    "process" | "move_to_draft" | null
  >(null)
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0)
  const revisionInputRef = useRef<HTMLInputElement | null>(null)

  const assetQuery = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => assetsApi.getSummaryById(assetId!),
    enabled: Boolean(assetId),
  })
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 5 * 60_000,
  })

  const asset = assetQuery.data ?? null
  const currentUser = meQuery.data ?? null
  const isLoading = Boolean(assetId) && assetQuery.isLoading
  const error =
    assetId && !assetQuery.isLoading ? (assetQuery.error?.message ?? null) : null

  const clientId = asset?.clientId
  const clientQuery = useQuery({
    queryKey: ["clients", clientId],
    queryFn: () => clientsApi.getById(clientId!),
    enabled: Boolean(clientId),
  })
  const client = clientQuery.data ?? null

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60_000,
  })
  const userMap = useMemo(() => {
    const map = new Map<string, User>()
    ;(usersQuery.data ?? []).forEach((user) => map.set(user.id, user))
    return map
  }, [usersQuery.data])

  const storageLabel = "Cloud Storage"

  const canApproveDraft = asset?.status === "draft"
  const canRequestRevision = asset?.status === "draft"
  const canApproveRevision = asset?.status === "revision_requested"
  const canProcessUpload = asset?.status === "uploaded"
  const canMoveToDraft = asset?.status === "uploaded"

  const invalidateAsset = () => {
    queryClient.invalidateQueries({ queryKey: ["asset", assetId] })
  }

  function refreshRevisions() {
    setRevisionRefreshKey((prev) => prev + 1)
  }

  const handleRevisionSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file || !asset) return
    if (!uploadRevisionEligible) {
      // respect existing revision eligibility rules
      toast({
        title: "Revision upload blocked",
        description: revisionEligibilityReason,
        variant: "destructive",
      })
      return
    }

    setIsUploadingRevision(true)
    setRevisionUploadProgress(0)
    try {
      const result = await assetsApi.uploadFile(asset.id, file, {
        onProgress: ({ percentage }) => {
          setIsUploadingRevision(true)
          setRevisionUploadProgress((prev) => Math.max(prev, percentage))
        },
      })
      setRevisionUploadProgress(100)
      toast({
        title: "Revision uploaded",
        description: "Revision uploaded successfully",
      })
      refreshRevisions()
      // also update local asset state from result if returned
      if (result) {
        queryClient.setQueryData(["asset", assetId], result)
      invalidateAsset()
      }
      clearApiClientCache()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      })
      setRevisionUploadProgress(0)
    } finally {
      setIsUploadingRevision(false)
      // reset input so same file can be selected again
      if (revisionInputRef.current) revisionInputRef.current.value = ""
    }
  }

  const handleApprovalAction = async (action: "approve" | "reject") => {
    if (!asset) {
      return
    }

    try {
      setApprovalAction(action)
      const response = await fetch(`/api/assets/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed")
      }

// SAFETY: this cast is safe because the value already conforms to the asserted type.
      const updated = payload.data as Asset
      queryClient.setQueryData(["asset", assetId], updated)
      invalidateAsset()
      toast({
        title: action === "approve" ? "Asset approved" : "Revision requested",
      })
      clearApiClientCache()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approval failed"
      toast({
        title: action === "approve" ? "Approval failed" : "Rejection failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setApprovalAction(null)
    }
  }

  const handleWorkflowStatus = async (
    nextStatus: Asset["status"],
    action: "process" | "move_to_draft",
  ) => {
    if (!asset) {
      return
    }

    try {
      setIsSaving(true)
      setWorkflowAction(action)
      const updated = await assetsApi.update(asset.id, { status: nextStatus })
      queryClient.setQueryData(["asset", assetId], updated)
      invalidateAsset()
      clearApiClientCache()
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status"
      toast({
        title: "Status update failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setWorkflowAction(null)
    }
  }

  const PreviewIcon = asset ? getAssetIcon(asset) : null
  const previewType = asset ? getAssetPreviewType(asset) : null
  const assetPreviewItem = asset ? toAssetPreviewDescriptor(asset) : null
  const uploadEligible = asset ? canUploadFromStatus(asset.status) : false
  const uploadRevisionEligible = asset
    ? canUploadRevisionFromStatus(asset.status)
    : false
  const revisionEligibilityReason = asset
    ? getRevisionEligibilityReason(asset.status)
    : "Revision uploads are blocked only for archived or published assets."

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Assets", href: "/dashboard/assets" },
            { label: "Loading..." },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Assets", href: "/dashboard/assets" },
            { label: "Error" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Assets", href: "/dashboard/assets" },
            { label: "Not found" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Assets", href: "/dashboard/assets" },
          { label: asset.title },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_640px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
                  Asset detail
                </p>
                <h1 className="mt-2 truncate text-[24px] font-semibold tracking-tight text-white sm:text-[28px]">
                  {asset.title}
                </h1>
                <p className="mt-2 text-[13px] text-[#a1a1aa]">
                  {client?.name ?? "Unknown client"} · {asset.type}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <StatusBadge status={asset.status} />

                {uploadEligible && (
                  <AssetFormDialog
                    mode="edit"
                    asset={asset}
                    onSaved={(updated) => {
                      queryClient.setQueryData(["asset", assetId], updated)
                      invalidateAsset()
                      queryClient.invalidateQueries({ queryKey: ["assets"] })
                      queryClient.invalidateQueries({
                        queryKey: ["clients", updated.clientId],
                      })
                    }}
                    trigger={
                      <Button className="h-10 w-full bg-[var(--primary)] px-3 text-[13px] text-white shadow-none hover:bg-[#4f46e5] sm:h-9 sm:w-auto">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Asset
                      </Button>
                    }
                  />
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)] sm:h-9 sm:w-9"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="border-[rgba(255,255,255,0.08)] bg-[#161616] text-white"
                  >
                    <AssetFormDialog
                      mode="edit"
                      asset={asset}
                      onSaved={(updated) => {
                        queryClient.setQueryData(["asset", assetId], updated)
                        invalidateAsset()
                        queryClient.invalidateQueries({ queryKey: ["assets"] })
                        queryClient.invalidateQueries({
                          queryKey: ["clients", updated.clientId],
                        })
                      }}
                      trigger={
                        <DropdownMenuItem
                          className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white"
                          onSelect={(event) => event.preventDefault()}
                        >
                          Edit Asset
                        </DropdownMenuItem>
                      }
                    />
                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                    <DropdownMenuItem className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white">
                      Download Asset
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                    <DropdownMenuItem className="cursor-pointer text-white focus:bg-[rgba(255,255,255,0.06)] focus:text-white">
                      Share
                    </DropdownMenuItem>
                    {currentUser?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                          onSelect={(event) => {
                            event.preventDefault()
                            setShowDelete(true)
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {assetPreviewItem ? (
                <AssetPreviewMedia
                  item={assetPreviewItem}
                  compact
                  className="aspect-video min-h-0 w-full"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]">
                  <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
                    {PreviewIcon ? (
                      <PreviewIcon className="h-14 w-14 text-[#71717a]" />
                    ) : null}
                    <div>
                      <p className="text-[13px] text-white">
                        {previewType === "image"
                          ? "Image preview unavailable"
                          : "Media preview unavailable"}
                      </p>
                      <p className="mt-1 text-[12px] text-[#71717a]">
                        {asset.fileExtension ??
                          asset.mimeType ??
                          "No preview metadata"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {asset.driveFileUrl && (
                  <Button
                    asChild
                    className="h-10 w-full bg-[var(--primary)] px-3 text-[13px] text-white shadow-none hover:bg-[#4f46e5] sm:h-9 sm:w-auto"
                  >
                    <a
                      href={asset.driveFileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open File
                    </a>
                  </Button>
                )}

                {asset.driveFileUrl && (
                  <Button
                    variant="outline"
                    className="h-10 w-full border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)] sm:h-9 sm:w-auto"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        asset.driveFileUrl ?? "",
                      )
                      toast({ title: "Link copied" })
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                )}
                {/* Upload revision hidden input */}
                <input
                  ref={(el) => {
                    revisionInputRef.current = el
                  }}
                  type="file"
                  accept="*/*"
                  className="hidden"
                  onChange={handleRevisionSelect}
                />

                {/* Upload Revision button (visual only changes) */}
                <button
                  onClick={() => revisionInputRef.current?.click()}
                  disabled={!uploadRevisionEligible || isUploadingRevision}
                  title={
                    !uploadRevisionEligible
                      ? revisionEligibilityReason
                      : undefined
                  }
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)] sm:h-9 sm:w-auto"
                  style={{
                    opacity: !uploadRevisionEligible
                      ? 0.35
                      : isUploadingRevision
                        ? 0.7
                        : undefined,
                    cursor:
                      !uploadRevisionEligible || isUploadingRevision
                        ? "not-allowed"
                        : undefined,
                  }}
                >
                  {isUploadingRevision ? (
                    <>
                      <span
                        className="mr-2 animate-spin"
                        style={{
                          width: 12,
                          height: 12,
                          borderWidth: 2,
                          borderStyle: "solid",
                          borderColor: "rgba(255,255,255,0.14)",
                          borderTopColor: "#3ecf8e",
                          borderRadius: "50%",
                          display: "inline-block",
                        }}
                      />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      <span>Upload Revision</span>
                    </>
                  )}
                </button>
              </div>
              {isUploadingRevision && (
                <div className="mt-3 w-full max-w-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <ProgressLabel>Uploading revision</ProgressLabel>
                    <ProgressValue>{revisionUploadProgress}%</ProgressValue>
                  </div>
                  <Progress
                    value={revisionUploadProgress}
                    className="h-2 bg-[rgba(255,255,255,0.08)]"
                  />
                </div>
              )}
            </div>
          </Card>

          {asset.description && (
            <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
              <h3 className="text-[13px] font-medium text-white">
                Description
              </h3>
              <p className="mt-3 text-[13px] leading-6 text-[#d4d4d8]">
                {asset.description}
              </p>
            </Card>
          )}

          <AssetCommentsSection assetId={asset.id} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
              Asset metadata
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Client</p>
                <p className="mt-1 font-medium text-white">
                  {client?.name ?? "Unknown client"}
                </p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Storage</p>
                <p className="mt-1 font-medium text-white">{storageLabel}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">File</p>
                <p className="mt-1 font-medium text-white">
                  {asset.fileExtension ?? asset.mimeType ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Preview</p>
                <p className="mt-1 font-medium text-white capitalize">
                  {previewType}
                </p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3 sm:col-span-2">
                <p className="text-[#71717a]">Assigned To</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {asset.assignedTo.length > 0 ? (
                    asset.assignedTo.map((userId) => (
                      <span
                        key={userId}
                        className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[12px] text-[#e4e4e7]"
                      >
                        {userMap.get(userId)?.name ?? userId}
                      </span>
                    ))
                  ) : (
                    <p className="text-[12px] text-[#71717a]">Unassigned</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3 text-[12px] text-[#a1a1aa]">
              {asset.driveFileUrl
                ? "Open the source file or copy the share link from the actions menu."
                : "This asset does not have a file URL linked yet."}
            </div>
          </Card>

          <AssetRevisionsSection
            assetId={asset.id}
            currentRevisionId={asset.currentRevisionId}
            refreshKey={revisionRefreshKey}
          />

          <AssetActivitySection assetId={asset.id} />

          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
                  Workflow actions
                </p>
                <p className="mt-2 text-[13px] text-[#d4d4d8]">
                  Move the asset through the pipeline.
                </p>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <div className="mt-4 space-y-2">
              {canProcessUpload && (
                <Button
                  className="h-9 w-full justify-between border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                  variant="default"
                  disabled={isSaving}
                  aria-busy={workflowAction === "process"}
                  onClick={() => handleWorkflowStatus("processing", "process")}
                >
                  <span>
                    {workflowAction === "process" ? "Processing…" : "Process"}
                  </span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              )}

              {canMoveToDraft && (
                <Button
                  className="h-9 w-full justify-between border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                  variant="outline"
                  disabled={isSaving}
                  aria-busy={workflowAction === "move_to_draft"}
                  onClick={() => handleWorkflowStatus("draft", "move_to_draft")}
                >
                  <span>
                    {workflowAction === "move_to_draft"
                      ? "Moving…"
                      : "Move to Draft"}
                  </span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              )}

              {canApproveDraft && (
                <Button
                  className="h-9 w-full justify-between border border-[rgba(16,185,129,0.2)] bg-transparent px-3 text-[13px] text-[#34d399] hover:bg-[rgba(16,185,129,0.1)] hover:text-[#34d399]"
                  variant="outline"
                  disabled={approvalAction !== null}
                  aria-busy={approvalAction === "approve"}
                  onClick={() => handleApprovalAction("approve")}
                >
                  <span>
                    {approvalAction === "approve" ? "Approving…" : "Approve"}
                  </span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              )}

              {canRequestRevision && (
                <Button
                  className="h-9 w-full justify-between border border-[rgba(239,68,68,0.2)] bg-transparent px-3 text-[13px] text-[#fca5a5] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#fca5a5]"
                  variant="outline"
                  disabled={approvalAction !== null}
                  aria-busy={approvalAction === "reject"}
                  onClick={() => handleApprovalAction("reject")}
                >
                  <span>
                    {approvalAction === "reject"
                      ? "Requesting…"
                      : "Request Revision"}
                  </span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              )}

              {canApproveRevision && (
                <Button
                  className="h-9 w-full justify-between border border-[rgba(16,185,129,0.2)] bg-transparent px-3 text-[13px] text-[#34d399] hover:bg-[rgba(16,185,129,0.1)] hover:text-[#34d399]"
                  variant="outline"
                  disabled={approvalAction !== null}
                  aria-busy={approvalAction === "approve"}
                  onClick={() => handleApprovalAction("approve")}
                >
                  <span>
                    {approvalAction === "approve" ? "Approving…" : "Approve"}
                  </span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              )}
            </div>

            {!uploadEligible && (
              <p className="mt-4 text-[12px] text-[#71717a]">
                {getUploadEligibilityReason(asset.status)}
              </p>
            )}
          </Card>

          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
              File storage
            </p>
            <p className="mt-2 text-[13px] text-[#d4d4d8]">
              {asset.driveFileUrl
                ? "File is stored in cloud storage and ready for access."
                : "No file has been uploaded yet."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {asset.driveFileUrl ? (
                <>
                  <Button
                    asChild
                    className="h-9 bg-[var(--primary)] px-3 text-[13px] text-white hover:bg-[#4f46e5]"
                  >
                    <a
                      href={asset.driveFileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open File
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        asset.driveFileUrl ?? "",
                      )
                      toast({ title: "Link copied" })
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </>
              ) : (
                <p className="text-[12px] text-[#71717a]">
                  Upload a file to see storage details.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the asset and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await assetsApi.delete(asset.id)
                  toast({ title: "Asset deleted" })
                  queryClient.invalidateQueries({ queryKey: ["assets"] })
                  clearApiClientCache()
                  router.refresh()
                  router.push("/dashboard/assets")
                } catch (err) {
                  const message =
                    err instanceof Error
                      ? err.message
                      : "Failed to delete asset"
                  toast({
                    title: "Delete failed",
                    description: message,
                    variant: "destructive",
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
