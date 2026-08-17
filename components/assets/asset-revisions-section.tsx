'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssetRevision, User } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { revisionsApi } from '@/lib/api-client';
import { formatFileSize } from '@/lib/asset-metadata';
import { AssetPreviewModal } from '@/components/assets/asset-preview-modal';
import { toAssetPreviewDescriptor, type AssetPreviewDescriptor } from '@/lib/asset-preview';

interface AssetRevisionsSectionProps {
  assetId: string;
  currentRevisionId?: string | null;
  refreshKey?: number;
}

export function AssetRevisionsSection({ assetId, currentRevisionId, refreshKey }: AssetRevisionsSectionProps) {
  const [revisions, setRevisions] = useState<AssetRevision[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [previewItem, setPreviewItem] = useState<AssetPreviewDescriptor | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(currentRevisionId ?? null);

  const loadRevisions = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await revisionsApi.getByAssetId(assetId);
      setRevisions(payload.revisions);
      setUsers(new Map(payload.users.map((user) => [user.id, user])));
      setHasLoaded(true);
      if (currentRevisionId !== undefined) {
        setActiveRevisionId(currentRevisionId ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [assetId, currentRevisionId]);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (!next && !hasLoaded) {
        void loadRevisions();
      }
      return next;
    });
  };

  const handleSetActive = async (revisionId: string) => {
    await fetch(`/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentRevisionId: revisionId }),
    });
    setActiveRevisionId(revisionId);
    await loadRevisions();
  };

  useEffect(() => {
    if (!hasLoaded || isCollapsed || refreshKey === undefined) {
      return;
    }
    void loadRevisions();
  }, [refreshKey, hasLoaded, isCollapsed, loadRevisions]);

  const revisionCount = revisions.length;

  const userMap = useMemo(() => users, [users]);

  return (
    <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5 border-t border-t-[rgba(255,255,255,0.07)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[13px] font-medium text-white">Revision History</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 h-5 rounded-full text-[10px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[#a1a1aa]">
            {revisionCount} versions
          </span>
          <button
            aria-expanded={!isCollapsed}
            onClick={handleToggle}
            className="text-[#71717a] hover:text-white transition-colors duration-150"
          >
            <svg
              className={`h-4 w-4 transform transition-transform duration-150 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="mt-4"
        style={{
          maxHeight: isCollapsed ? 0 : 1000,
          overflow: 'hidden',
          transition: 'max-height 200ms ease',
        }}
      >
        {isLoading ? (
          <div className="py-6 text-[12px] text-[#71717a]">Loading revisions...</div>
        ) : revisionCount === 0 ? (
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
              {revisions.map((rev, idx) => {
                const isActive = activeRevisionId === rev.id;
                const versionLabel = rev.versionNumber ?? idx + 1;
                const uploadedAt = rev.uploadedAt ? new Date(rev.uploadedAt) : rev.createdAt ? new Date(rev.createdAt) : null;
                const uploader = rev.uploadedBy ? (userMap.get(rev.uploadedBy)?.name ?? rev.uploadedBy) : 'Unknown';
                const revisionPreviewItem = toAssetPreviewDescriptor({
                  title: `Revision v${versionLabel}`,
                  mimeType: rev.mimeType,
                  driveFileId: rev.driveFileId,
                  driveFileUrl: rev.driveFileUrl,
                  fileSize: rev.fileSize,
                  durationSeconds: rev.durationSeconds,
                });

                return (
                  <div key={rev.id} className="relative">
                    <span
                      className={`absolute left-0 top-3 rounded-full ${isActive ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
                      style={{
                        background: isActive ? '#3ecf8e' : 'rgba(255,255,255,0.06)',
                        display: 'inline-block',
                      }}
                    />

                    {isActive ? (
                      <div className="ml-4 bg-[#1c1c1c] border rounded-[10px]" style={{ border: '1px solid rgba(99,102,241,0.35)' }}>
                        <div style={{ borderLeft: '3px solid #3ecf8e' }} className="px-4 py-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[14px] font-medium text-white">v{versionLabel}</p>
                            <span className="inline-flex items-center px-3 rounded-full" style={{ height: 18, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#3ecf8e', fontSize: 10 }}>
                              Active
                            </span>
                          </div>
                          <p className="text-[12px] text-[#a1a1aa] mt-1">
                            Uploaded by {uploader} · {uploadedAt ? uploadedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Unknown'}
                          </p>
                          <p className="text-[12px] text-[#71717a] mt-1">
                            {rev.mimeType ?? ''} {rev.fileSize ? `· ${formatFileSize(rev.fileSize)}` : ''}
                          </p>
                          {rev.changeNote ? <p className="italic text-[12px] text-[#71717a] mt-3">{rev.changeNote}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                              onClick={() => {
                                setPreviewItem(revisionPreviewItem);
                                setIsPreviewOpen(true);
                              }}
                            >
                              Preview
                            </Button>
                            {rev.driveFileUrl ? (
                              <Button asChild size="sm" className="h-8 bg-[var(--primary)] px-3 text-[12px] text-white shadow-none hover:bg-[#4f46e5]">
                                <a href={rev.driveFileUrl} target="_blank" rel="noreferrer">Open</a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-4 bg-[#161616] border border-[rgba(255,255,255,0.07)] rounded-[8px] py-2.5 px-3.5 hover:bg-[#191919] hover:border-[rgba(255,255,255,0.12)] transition-colors duration-150">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[13px] font-normal text-[#a1a1aa]">v{versionLabel}</p>
                            <p className="text-[12px] text-[#71717a] mt-1">
                              Uploaded by {uploader} · {uploadedAt ? uploadedAt.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setPreviewItem(revisionPreviewItem);
                                setIsPreviewOpen(true);
                              }}
                              className="text-[12px] text-[#71717a] hover:text-[#a1a1aa]"
                            >
                              Preview
                            </button>
                            {rev.driveFileUrl ? (
                              <a href={rev.driveFileUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[#71717a] hover:text-[#a1a1aa]">
                                Open
                              </a>
                            ) : null}
                            <button
                              onClick={() => handleSetActive(rev.id)}
                              className="h-7 text-[12px] inline-flex items-center px-3 border border-[rgba(255,255,255,0.08)] rounded-md text-[#a1a1aa] hover:border-[rgba(16,185,129,0.3)] hover:text-[#3ecf8e] hover:bg-[rgba(16,185,129,0.08)] transition-colors duration-150"
                            >
                              Set Active
                            </button>
                          </div>
                        </div>
                        {rev.changeNote ? <p className="text-[12px] text-[#71717a] mt-2 italic">{rev.changeNote}</p> : null}
                        <div className="mt-2 text-[12px] text-[#71717a] flex gap-3">
                          {rev.fileSize ? <span>{formatFileSize(rev.fileSize)}</span> : null}
                          {rev.mimeType ? <span>{rev.mimeType}</span> : null}
                          {rev.durationSeconds ? <span>{Math.round(rev.durationSeconds)}s</span> : null}
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

      <AssetPreviewModal
        item={previewItem}
        open={isPreviewOpen && Boolean(previewItem)}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewItem(null);
          }
        }}
      />
    </Card>
  );
}
