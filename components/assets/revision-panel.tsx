 'use client';

import type { AssetRevision, User } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AssetPreviewModal } from '@/components/assets/asset-preview-modal';
import { toAssetPreviewDescriptor, type AssetPreviewDescriptor } from '@/lib/asset-preview';

type RevisionRecord = AssetRevision;

interface RevisionPanelProps {
  revisions: RevisionRecord[];
  assetTitle: string;
}

export function RevisionPanel({ revisions, assetTitle }: RevisionPanelProps) {
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [previewItem, setPreviewItem] = useState<AssetPreviewDescriptor | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadUsers = async () => {
      try {
        const allUsers = await usersApi.getAll();
        const userMap = new Map(allUsers.map((u) => [u.id, u]));
        if (isActive) {
          setUsers(userMap);
        }
      } catch {
        if (isActive) {
          setUsers(new Map());
        }
      }
    };

    void loadUsers();

    return () => {
      isActive = false;
    };
  }, []);

  if (revisions.length === 0) {
    return (
      <Card className="p-6 border border-border">
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No revisions yet</p>
        </div>
      </Card>
    );
  }

  const getUser = (userId: string) => {
    return users.get(userId) || {
      id: userId,
      name: 'Unknown',
      email: 'unknown@example.com',
      role: 'designer' as const,
      createdAt: new Date(),
    };
  };

  return (
    <Card className="p-6 border border-border space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Revision History</h3>

      <div className="space-y-4">
        {revisions.map((revision, index) => {
          const authorId = revision.uploadedBy ?? 'unknown';
          const author = getUser(authorId);
          const versionLabel = revision.versionNumber ?? index + 1;
          const revisionNote = revision.changeNote ?? 'Revision upload';
          const previewDescriptor = toAssetPreviewDescriptor({
            title: `${assetTitle} v${versionLabel}`,
            mimeType: revision.mimeType ?? null,
            driveFileId: revision.driveFileId ?? null,
            driveFileUrl: revision.driveFileUrl ?? null,
            fileSize: revision.fileSize ?? null,
            durationSeconds: revision.durationSeconds ?? null,
          });
          return (
            <div
              key={revision.id}
              className="pb-4 border-b border-border last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Version {versionLabel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested by {author.name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(revision.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-foreground mb-3">{revisionNote}</p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPreviewItem(previewDescriptor);
                    setIsPreviewOpen(true);
                  }}
                >
                  Preview
                </Button>
                {revision.driveFileUrl ? (
                  <Button asChild size="sm">
                    <a href={revision.driveFileUrl} target="_blank" rel="noreferrer">
                      Open Revision
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
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
        description={`Preview revision history for ${assetTitle}`}
      />
    </Card>
  );
}
