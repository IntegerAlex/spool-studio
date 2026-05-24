'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { CommentsThread } from '@/components/assets/comments-thread';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { StatusBadge } from '@/components/assets/status-badge';
import { assetsApi, clientsApi, commentsApi, usersApi } from '@/lib/api-client';
import { Asset, AssetComment, Client, User } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Copy, FileText, FolderOpen, MoreHorizontal, Upload } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { canUploadFromStatus, canUploadRevisionFromStatus, getAllowedTransitions, getRevisionEligibilityReason, getTransitionActionLabel, getUploadEligibilityReason } from '@/lib/asset-workflow';
import { formatRelativeTime, getAssetIcon, getAssetPreviewType } from '@/lib/asset-display';
import { formatFileSize } from '@/lib/asset-metadata';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params.id as string | undefined;
  const router = useRouter();
  const { toast } = useToast();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);
  const [revisionUploadProgress, setRevisionUploadProgress] = useState(0);
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const revisionInputRef = useRef<HTMLInputElement | null>(null);
  const [revisionsCollapsed, setRevisionsCollapsed] = useState(false);

  const driveFolderLabel = asset?.type === 'reel'
    ? 'Reels'
    : asset?.type === 'poster'
      ? 'Posters'
      : 'Exports';

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!assetId) {
          setError('Asset id is required');
          setIsLoading(false);
          return;
        }
        setError(null);
        const assetData = await assetsApi.getById(assetId);
        if (assetData) {
          setAsset(assetData);
          const [clientData, usersData] = await Promise.all([
            clientsApi.getById(assetData.clientId),
            usersApi.getAll(),
          ]);
          setClient(clientData);
          setUserMap(new Map(usersData.map((user) => [user.id, user])));
        } else {
          setComments([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load asset';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [assetId]);

  useEffect(() => {
    if (!asset?.id) {
      return;
    }

    let isActive = true;

    const loadComments = async () => {
      console.info('[asset][comments] fetch start', { assetId: asset.id });
      setIsLoadingComments(true);
      try {
        const fetched = await commentsApi.getByAssetId(asset.id);
        if (!isActive) {
          return;
        }
        setComments(fetched);
        console.info('[asset][comments] fetch success', { assetId: asset.id, count: fetched.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load comments';
        console.error('[asset][comments] api failure', { assetId: asset.id, stage: 'fetch', error: message });
      } finally {
        if (isActive) {
          setIsLoadingComments(false);
        }
      }
    };

    void loadComments();

    return () => {
      isActive = false;
    };
  }, [asset?.id]);

  async function refreshRevisions() {
    if (!asset?.id) return;
    try {
      const refreshed = await assetsApi.getById(asset.id);
      if (refreshed) {
        setAsset(refreshed);
        console.log(`[asset][revision-ui] timeline refreshed — ${refreshed.revisions?.length ?? 0} revisions loaded`);
      }
    } catch (err) {
      console.error('[asset][revision-ui] timeline refresh failed', { assetId: asset.id, error: err });
    }
  }

  const handleRevisionSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !asset) return;
    if (!uploadRevisionEligible) {
      // respect existing revision eligibility rules
      toast({ title: 'Revision upload blocked', description: revisionEligibilityReason, variant: 'destructive' });
      return;
    }

    console.log('[asset][revision-ui] upload start — assetId:', asset.id, 'file:', file.name);
    setIsUploadingRevision(true);
    setRevisionUploadProgress(0);
    try {
      const result = await assetsApi.uploadFile(asset.id, file, {
        onProgress: ({ percentage }) => {
          setIsUploadingRevision(true);
          setRevisionUploadProgress(percentage);
        },
      });
      setRevisionUploadProgress(100);
      console.log('[asset][revision-ui] upload success — new revisionId:', result.upload?.driveFileId ?? 'unknown');
      toast({ title: 'Revision uploaded', description: 'Revision uploaded successfully' });
      // refresh asset and revisions
      await refreshRevisions();
      // also update local asset state from result if returned
      if (result) {
        setAsset(result as unknown as Asset);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      console.error('[asset][revision-ui] upload failed — error:', message);
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
      setRevisionUploadProgress(0);
    } finally {
      setIsUploadingRevision(false);
      // reset input so same file can be selected again
      if (revisionInputRef.current) revisionInputRef.current.value = '';
    }
  };

  const handleSetActive = async (revisionId: string) => {
    if (!asset) return;
    console.log('[asset][revision-ui] set active — revisionId:', revisionId);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRevisionId: revisionId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed to set active revision');
      await refreshRevisions();
      console.log('[asset][revision-ui] active updated — assetId:', asset.id, 'now active:', revisionId);
      toast({ title: 'Active revision updated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set active revision';
      console.error('[asset][revision-ui] set active failed — error:', message);
      toast({ title: 'Set active failed', description: message, variant: 'destructive' });
    }
  };

  const handleAddComment = async (content: string, isInternal: boolean) => {
    if (!asset) {
      return;
    }

    const message = content.trim();
    if (!message) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: AssetComment = {
      id: optimisticId,
      assetId: asset.id,
      userId: 'me',
      type: isInternal ? 'internal_note' : 'comment',
      message,
      isInternal,
      revisionStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.info('[asset][comments] optimistic update', {
      assetId: asset.id,
      optimisticId,
      isInternal,
    });

    setComments((prev) => [...prev, optimisticComment]);

    try {
      console.info('[asset][comments] comment create', { assetId: asset.id, isInternal });
      const created = await commentsApi.create(asset.id, { message, isInternal });

      setComments((prev) => prev.map((entry) => (entry.id === optimisticId ? created : entry)));

      console.info('[asset][comments] refetch start', { assetId: asset.id });
      const refreshed = await commentsApi.getByAssetId(asset.id);
      setComments(refreshed);
      console.info('[asset][comments] refetch success', { assetId: asset.id, count: refreshed.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setComments((prev) => prev.filter((entry) => entry.id !== optimisticId));
      console.error('[asset][comments] api failure', {
        assetId: asset.id,
        stage: 'create',
        error: errorMessage,
      });
      toast({ title: 'Failed to add comment', description: errorMessage, variant: 'destructive' });
      throw err;
    }
  };

  const PreviewIcon = asset ? getAssetIcon(asset) : null;
  const previewType = asset ? getAssetPreviewType(asset) : null;
  const uploadEligible = asset ? canUploadFromStatus(asset.status) : false;
  const uploadRevisionEligible = asset ? canUploadRevisionFromStatus(asset.status) : false;
  const revisionEligibilityReason = asset ? getRevisionEligibilityReason(asset.status) : 'Revision uploads are blocked only for archived or published assets.';

  useEffect(() => {
    if (!asset) {
      return;
    }

    console.info('[asset][revision-eligibility]', {
      assetId: asset.id,
      assetStatus: asset.status,
      evaluatedEligibility: uploadRevisionEligible,
      reason: revisionEligibilityReason,
    });
  }, [asset, uploadRevisionEligible, revisionEligibilityReason]);


  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Assets', href: '/dashboard/assets' },
            { label: 'Loading...' },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Assets', href: '/dashboard/assets' },
            { label: 'Error' },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Assets', href: '/dashboard/assets' },
            { label: 'Not found' },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/dashboard/assets' },
          { label: asset.title },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_640px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">Asset detail</p>
                <h1 className="mt-2 truncate text-[28px] font-semibold tracking-tight text-white">{asset.title}</h1>
                <p className="mt-2 text-[13px] text-[#a1a1aa]">
                  {client?.name ?? 'Unknown client'} · {asset.type}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={asset.status} />

                {uploadEligible && (
                  <AssetFormDialog
                    mode="edit"
                    asset={asset}
                    onSaved={(updated) => {
                      setAsset(updated);
                      clientsApi.getById(updated.clientId).then(setClient).catch(() => undefined);
                    }}
                    trigger={
                      <Button className="h-9 bg-[var(--primary)] px-3 text-[13px] text-white shadow-none hover:bg-[#4f46e5]">
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
                      className="h-9 w-9 border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-[rgba(255,255,255,0.08)] bg-[#161616] text-white">
                    <AssetFormDialog
                      mode="edit"
                      asset={asset}
                      onSaved={(updated) => {
                        setAsset(updated);
                        clientsApi.getById(updated.clientId).then(setClient).catch(() => undefined);
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
                    <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.08)]" />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                      onSelect={(event) => {
                        event.preventDefault();
                        setShowDelete(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

              <div className="mt-5 space-y-4">
              <div className="flex h-[260px] items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]">
                {asset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <PreviewIcon className="h-14 w-14 text-[#71717a]" />
                    <div>
                      <p className="text-[13px] text-white">{previewType === 'image' ? 'Image preview unavailable' : 'Media preview unavailable'}</p>
                      <p className="mt-1 text-[12px] text-[#71717a]">{asset.fileExtension ?? asset.mimeType ?? 'No preview metadata'}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {asset.driveFileUrl && (
                  <Button
                    asChild
                    className="h-9 bg-[var(--primary)] px-3 text-[13px] text-white shadow-none hover:bg-[#4f46e5]"
                  >
                    <a href={asset.driveFileUrl} target="_blank" rel="noreferrer">
                      Open File
                    </a>
                  </Button>
                )}

                {asset.driveFolderUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                  >
                    <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open Folder
                    </a>
                  </Button>
                )}

                {asset.driveFileUrl && (
                  <Button
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.driveFileUrl ?? '');
                      toast({ title: 'Link copied' });
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                )}
                {/* Upload revision hidden input */}
                <input
                  ref={(el) => (revisionInputRef.current = el)}
                  type="file"
                  accept="*/*"
                  className="hidden"
                  onChange={handleRevisionSelect}
                />

                {/* Upload Revision button (visual only changes) */}
                <button
                  onClick={() => revisionInputRef.current?.click()}
                  disabled={!uploadRevisionEligible || isUploadingRevision}
                  title={!uploadRevisionEligible ? revisionEligibilityReason : undefined}
                  className="inline-flex items-center justify-center h-9 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)] rounded-md"
                  style={{
                    opacity: !uploadRevisionEligible ? 0.35 : isUploadingRevision ? 0.7 : undefined,
                    cursor: !uploadRevisionEligible || isUploadingRevision ? 'not-allowed' : undefined,
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
                          borderStyle: 'solid',
                          borderColor: 'rgba(255,255,255,0.14)',
                          borderTopColor: '#6366f1',
                          borderRadius: '50%',
                          display: 'inline-block',
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
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#71717a]">
                    <span>Uploading revision</span>
                    <span>{revisionUploadProgress}%</span>
                  </div>
                  <Progress value={revisionUploadProgress} className="h-2 bg-[rgba(255,255,255,0.08)]" />
                </div>
              )}
            </div>
          </Card>

          {asset.description && (
            <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
              <h3 className="text-[13px] font-medium text-white">Description</h3>
              <p className="mt-3 text-[13px] leading-6 text-[#d4d4d8]">{asset.description}</p>
            </Card>
          )}

          <CommentsThread comments={comments} onAddComment={handleAddComment} isLoading={isLoadingComments} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">Asset metadata</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Client</p>
                <p className="mt-1 font-medium text-white">{client?.name ?? 'Unknown client'}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Folder</p>
                <p className="mt-1 font-medium text-white">{driveFolderLabel}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">File</p>
                <p className="mt-1 font-medium text-white">{asset.fileExtension ?? asset.mimeType ?? 'Unknown'}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Preview</p>
                <p className="mt-1 font-medium text-white capitalize">{previewType}</p>
              </div>
              <div className="col-span-2 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] p-3">
                <p className="text-[#71717a]">Assigned To</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {asset.assignedTo.length > 0 ? (
                    asset.assignedTo.map((userId) => (
                      <span key={userId} className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[12px] text-[#e4e4e7]">
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
              {asset.driveFileUrl ? 'Open the source file or copy the share link from the actions menu.' : 'This asset does not have a file URL linked yet.'}
            </div>
          </Card>

          {/* Revision History Panel */}
          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 border-t border-t-[rgba(255,255,255,0.07)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium text-white">Revision History</h3>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 h-5 rounded-full text-[10px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[#a1a1aa]">{asset.revisions?.length ?? 0} versions</span>
                <button
                  aria-expanded={!revisionsCollapsed}
                  onClick={() => setRevisionsCollapsed((s) => !s)}
                  className="text-[#71717a] hover:text-white transition-colors duration-150"
                >
                  <svg className={`h-4 w-4 transform transition-transform duration-150 ${revisionsCollapsed ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>

            <div
              className="mt-4"
              style={{
                maxHeight: revisionsCollapsed ? 0 : 1000,
                overflow: 'hidden',
                transition: 'max-height 200ms ease',
              }}
            >
              {/* timeline wrapper */}
              {(asset.revisions ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-15">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-3" style={{ color: '#252525' }}>
                    <path d="M3 7h18M3 12h18M3 17h18" stroke="#252525" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[14px] text-[#71717a]">No revisions yet</p>
                  <p className="text-[12px] text-[#52525b]">Upload a revision to start tracking history</p>
                </div>
              ) : (
                <div className="relative pl-8">
                  <div className="absolute left-3 top-3 bottom-3 w-[2px] bg-[rgba(255,255,255,0.06)]" />
                  <div className="space-y-2">
                    {(asset.revisions ?? []).map((rev, idx) => {
                      const isActive = asset.currentRevisionId === rev.id;
                      const versionLabel = rev.versionNumber ?? idx + 1;
                      const uploadedAt = rev.uploadedAt ? new Date(rev.uploadedAt) : rev.createdAt ? new Date(rev.createdAt) : null;
                      const uploader = rev.uploadedBy ? (userMap.get(rev.uploadedBy)?.name ?? rev.uploadedBy) : 'Unknown';
                      return (
                        <div key={rev.id} className={`relative ${isActive ? '' : ''}`}>
                          {/* dot */}
                          <span
                            className={`absolute left-0 top-3 rounded-full ${isActive ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
                            style={{
                              background: isActive ? '#6366f1' : 'rgba(255,255,255,0.06)',
                              display: 'inline-block',
                            }}
                          />

                          {isActive ? (
                            <div
                              className="ml-4 bg-[#1c1c1c] border rounded-[10px]"
                              style={{ border: '1px solid rgba(99,102,241,0.35)' }}
                            >
                              <div style={{ borderLeft: '3px solid #6366f1' }} className="px-4 py-3.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-[14px] font-medium text-white">v{versionLabel}</p>
                                  <span className="inline-flex items-center px-3 rounded-full" style={{ height: 18, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 10 }}>
                                    Active
                                  </span>
                                </div>
                                <p className="text-[12px] text-[#a1a1aa] mt-1">Uploaded by {uploader} · {uploadedAt ? uploadedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Unknown'}</p>
                                <p className="text-[12px] text-[#71717a] mt-1">{rev.mimeType ?? ''} {rev.fileSize ? `· ${formatFileSize(rev.fileSize)}` : ''}</p>
                                {rev.changeNote && <p className="italic text-[12px] text-[#71717a] mt-3">{rev.changeNote}</p>}
                                <div className="mt-3">
                                  {rev.driveFileUrl && <a href={rev.driveFileUrl} target="_blank" rel="noreferrer" className="text-[12px]" style={{ color: '#6366f1' }}>Open</a>}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="ml-4 bg-[#161616] border border-[rgba(255,255,255,0.07)] rounded-[8px] py-2.5 px-3.5 hover:bg-[#191919] hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-[13px] font-normal text-[#a1a1aa]">v{versionLabel}</p>
                                  <p className="text-[12px] text-[#71717a] mt-1">Uploaded by {uploader} · {uploadedAt ? uploadedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Unknown'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {rev.driveFileUrl && <a href={rev.driveFileUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[#71717a] hover:text-[#a1a1aa]">Open</a>}
                                  <button
                                    onClick={() => handleSetActive(rev.id)}
                                    className="h-7 text-[12px] inline-flex items-center px-3 border border-[rgba(255,255,255,0.08)] rounded-md text-[#a1a1aa] hover:border-[rgba(99,102,241,0.3)] hover:text-[#818cf8] hover:bg-[rgba(99,102,241,0.08)] transition-colors duration-150"
                                  >
                                    Set Active
                                  </button>
                                </div>
                              </div>
                              {rev.changeNote && <p className="text-[12px] text-[#71717a] mt-2 italic">{rev.changeNote}</p>}
                              <div className="mt-2 text-[12px] text-[#71717a] flex gap-3">
                                {rev.fileSize && <span>{formatFileSize ? formatFileSize(rev.fileSize) : `${rev.fileSize} bytes`}</span>}
                                {rev.mimeType && <span>{rev.mimeType}</span>}
                                {rev.durationSeconds && <span>{Math.round(rev.durationSeconds)}s</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">Workflow actions</p>
                <p className="mt-2 text-[13px] text-[#d4d4d8]">Move the asset through the pipeline.</p>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <div className="mt-4 space-y-2">
              {getAllowedTransitions(asset.status).map((nextStatus) => (
                <Button
                  key={nextStatus}
                  className="h-9 w-full justify-between border border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                  variant={nextStatus === 'revision_requested' ? 'outline' : 'default'}
                  disabled={isSaving}
                  onClick={async () => {
                    if (nextStatus === 'scheduled' && !asset.scheduledAt) {
                      toast({
                        title: 'Missing schedule',
                        description: 'Add a scheduled date before moving to Scheduled.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    try {
                      setIsSaving(true);
                      const updated = await assetsApi.update(asset.id, { status: nextStatus });
                      setAsset(updated);
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Failed to update status';
                      toast({
                        title: 'Status update failed',
                        description: message,
                        variant: 'destructive',
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <span>{getTransitionActionLabel(asset.status, nextStatus)}</span>
                  <span className="text-[#71717a]">→</span>
                </Button>
              ))}
            </div>

            {!uploadEligible && (
              <p className="mt-4 text-[12px] text-[#71717a]">{getUploadEligibilityReason(asset.status)}</p>
            )}
          </Card>

          <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#71717a]">Drive handoff</p>
            <p className="mt-2 text-[13px] text-[#d4d4d8]">
              {asset.driveFolderUrl ? 'Linked folder ready for upload handoff.' : 'No Drive folder has been linked yet.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {asset.driveFolderUrl ? (
                <>
                  <Button asChild className="h-9 bg-[var(--primary)] px-3 text-[13px] text-white hover:bg-[#4f46e5]">
                    <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open Folder
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.driveFolderUrl ?? '');
                      toast({ title: 'Folder link copied' });
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Folder Link
                  </Button>
                </>
              ) : (
                <p className="text-[12px] text-[#71717a]">The folder association will appear here once Drive lookup succeeds.</p>
              )}
            </div>

            {asset.driveFolderId && (
              <p className="mt-3 text-[12px] text-[#71717a]">Folder ID: {asset.driveFolderId}</p>
            )}
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
                  await assetsApi.delete(asset.id);
                  toast({ title: 'Asset deleted' });
                  router.push('/dashboard/assets');
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to delete asset';
                  toast({
                    title: 'Delete failed',
                    description: message,
                    variant: 'destructive',
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
