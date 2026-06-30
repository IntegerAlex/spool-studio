'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import ErrorBoundary from '@/components/ui/error-boundary';
import { PageSkeleton } from '@/components/ui/page-skeleton';
const KanbanBoard = dynamic(() => import('@/components/kanban/board').then((mod) => mod.KanbanBoard), {
  ssr: false,
  loading: () => <PageSkeleton rows={3} />,
});
import { assetsApi, kanbanApi } from '@/lib/api-client';
import type { Asset, KanbanClientOption } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const AssetFormDialog = dynamic(
  () => import('@/components/assets/asset-form-dialog').then((mod) => mod.AssetFormDialog),
  {
    ssr: false,
    loading: () => <PageSkeleton rows={2} />,
  }
);

export default function KanbanPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<KanbanClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const { assets: assetsData, clients: clientsData } = await kanbanApi.getBoard();
        setAssets(assetsData);
        setClients(clientsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load kanban data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClient = selectedClient === 'all' || asset.clientId === selectedClient;
      return matchesSearch && matchesClient;
    });
  }, [assets, searchQuery, selectedClient]);

  const handleStatusChange = async (assetId: string, newStatus: Asset['status']) => {
    let previousAssets: Asset[] = [];
    setAssets((prev) => {
      previousAssets = prev;
      return prev.map((item) =>
        item.id === assetId
          ? {
              ...item,
              status: newStatus,
            }
          : item
      );
    });

    try {
      const updated = await assetsApi.update(assetId, { status: newStatus });
      setAssets((prev) => prev.map((item) => (item.id === assetId ? updated : item)));
    } catch (err) {
      setAssets(previousAssets);
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast({
        title: 'Status update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 kanban-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '24px 32px' }}>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban Board' }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="kanban-title">Kanban Board</h1>
          <p className="kanban-subtitle">Track and coordinate deliverable status changes</p>
        </div>

        <div className="search-container w-full lg:hidden">
          <Search className="search-icon" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="search-container hidden lg:block">
            <Search className="search-icon" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={cn("filter-btn", selectedClient !== "all" && "active")}>
                {selectedClient === 'all'
                  ? 'All Clients'
                  : clients.find((c) => c.id === selectedClient)?.name || 'Select Client'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <DropdownMenuItem
                className={cn("text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]", selectedClient === 'all' && 'bg-[var(--color-bg-active)] text-white')}
                onSelect={() => setSelectedClient('all')}
              >
                All Clients
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--color-border)]" />
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  className={cn("text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]", selectedClient === client.id && 'bg-[var(--color-bg-active)] text-white')}
                  onSelect={() => setSelectedClient(client.id)}
                >
                  {client.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <AssetFormDialog
            mode="create"
            onSaved={(asset) => setAssets((prev) => [asset, ...prev])}
            trigger={
              <Button variant="accent">
                <Plus className="w-4 h-4 mr-2" />
                New Asset
              </Button>
            }
          />
        </div>
      </div>

        <KanbanBoard assets={filteredAssets} onStatusChange={handleStatusChange} />
      </div>
    </ErrorBoundary>
  );
}
