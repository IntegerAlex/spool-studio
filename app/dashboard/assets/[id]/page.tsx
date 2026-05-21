'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { CommentsThread } from '@/components/assets/comments-thread';
import { RevisionPanel } from '@/components/assets/revision-panel';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { StatusBadge } from '@/components/assets/status-badge';
import { assetsApi, clientsApi, usersApi } from '@/lib/api-client';
import { Asset, Client, User } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, FileText, FolderOpen, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getAllowedTransitions, getTransitionActionLabel } from '@/lib/asset-workflow';
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
          <StatusBadge status={asset.status} className="px-4 py-2 text-sm" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-border text-foreground hover:bg-muted">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <AssetFormDialog
                mode="edit"
                asset={asset}
                onSaved={(updated) => {
                  setAsset(updated);
                  clientsApi.getById(updated.clientId).then(setClient).catch(() => undefined);
                }}
                trigger={
                  <DropdownMenuItem
                    className="text-foreground cursor-pointer hover:bg-muted"
                    onSelect={(event) => event.preventDefault()}
                  >
                    Edit Asset
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                Download Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-destructive cursor-pointer hover:bg-destructive/10"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-muted/30 border border-border rounded-lg p-4 flex flex-col min-h-64">
            <div className="flex flex-col items-center justify-center gap-4">
              {asset.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.thumbnailUrl} alt={asset.title} className="w-full max-h-80 object-contain rounded" />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {asset.type === 'reel' ? '🎬 Instagram Reel' : '📱 Poster'} Preview
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                {asset.driveFileUrl && (
                  <Button asChild variant="default">
                    <a href={asset.driveFileUrl} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </Button>
                )}

                {asset.driveFolderUrl && (
                  <Button asChild variant="ghost">
                    <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer">
                      Open folder
                    </a>
                  </Button>
                )}

                {asset.driveFileUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.driveFileUrl ?? '');
                      toast({ title: 'Link copied' });
                    }}
                  >
                    Copy link
                  </Button>
                )}
              </div>

              <Card className="w-full border border-border bg-muted/20 p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Drive destination</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{driveFolderLabel}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {asset.driveFolderUrl
                        ? 'Linked folder ready for upload handoff.'
                        : 'No Drive folder has been linked yet.'}
                    </p>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                    {driveFolderLabel}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {asset.driveFolderUrl ? (
                    <>
                      <Button asChild variant="default">
                        <a href={asset.driveFolderUrl} target="_blank" rel="noreferrer">
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Open Folder
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border text-foreground hover:bg-muted"
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
                    <p className="text-sm text-muted-foreground">
                      The folder association will appear here once Drive lookup succeeds.
                    </p>
                  )}
                </div>

                {asset.driveFolderId && (
                  <p className="mt-3 text-xs text-muted-foreground">Folder ID: {asset.driveFolderId}</p>
                )}
              </Card>
            </div>
          </Card>

          {asset.description && (
            <Card className="p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
              <p className="text-foreground">{asset.description}</p>
            </Card>
          )}

          <CommentsThread comments={asset.comments} readOnly />
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
                      {userMap.get(userId)?.name ?? userId}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {getAllowedTransitions(asset.status).map((nextStatus) => (
                <Button
                  key={nextStatus}
                  className="w-full"
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
                  {getTransitionActionLabel(asset.status, nextStatus)}
                </Button>
              ))}
            </div>
          </Card>

          <RevisionPanel revisions={asset.revisions} assetTitle={asset.title} />
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
