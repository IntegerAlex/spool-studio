'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { CommentsThread } from '@/components/assets/comments-thread';
import { RevisionPanel } from '@/components/assets/revision-panel';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, User, Calendar, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const assetData = await assetsApi.getById(assetId);
        if (assetData) {
          setAsset(assetData);
          const clientData = await clientsApi.getById(assetData.clientId);
          setClient(clientData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [assetId]);

  const handleAddComment = async (content: string, isInternal: boolean) => {
    if (!asset) return;
    const updatedAsset = await assetsApi.addComment(asset.id, content, isInternal);
    setAsset(updatedAsset);
  };

  const handleRequestRevision = async (reason: string) => {
    if (!asset) return;
    const updatedAsset = await assetsApi.requestRevision(asset.id, reason);
    setAsset(updatedAsset);
  };

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
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assets', href: '/dashboard/assets' },
          { label: asset.title },
        ]}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{asset.title}</h1>
          {client && (
            <p className="text-muted-foreground">{client.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            asset.status === 'approved'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : asset.status === 'revision_requested'
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
              : asset.status === 'scheduled'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {asset.status.replace(/_/g, ' ')}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-border text-foreground hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                Download Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-destructive cursor-pointer hover:bg-destructive/10">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-muted/30 border border-border rounded-lg p-12 flex flex-col items-center justify-center min-h-64">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {asset.type === 'reel' ? '🎬 Instagram Reel' : asset.type === 'poster' ? '📱 Poster' : asset.type === 'carousel' ? '🖼️ Carousel' : '📸 Story'} Preview
            </p>
            <p className="text-sm text-muted-foreground mt-2">Google Drive integration placeholder</p>
          </Card>

          {asset.description && (
            <Card className="p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
              <p className="text-foreground">{asset.description}</p>
            </Card>
          )}

          <CommentsThread
            comments={asset.comments}
            onAddComment={handleAddComment}
          />
        </div>

        <div className="space-y-6">
          <Card className="p-6 border border-border space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Asset Type</p>
              <p className="text-sm font-medium text-foreground capitalize">{asset.type}</p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(asset.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(asset.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3">Assigned To</p>
              <div className="flex flex-wrap gap-2">
                {asset.assignedTo.length > 0 ? (
                  asset.assignedTo.map((userId) => (
                    <span
                      key={userId}
                      className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {userId}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {asset.status === 'ready_for_review' && (
                <>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    ✓ Approve
                  </Button>
                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
                    Request Revisions
                  </Button>
                </>
              )}
              {asset.status === 'revision_requested' && (
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Mark as Ready
                </Button>
              )}
            </div>
          </Card>

          <RevisionPanel revisions={asset.revisions} assetTitle={asset.title} />
        </div>
      </div>
    </div>
  );
}
