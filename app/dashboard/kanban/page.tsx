'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { KanbanBoard } from '@/components/kanban/board';
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

const AssetFormDialog = dynamic(
  () => import('@/components/assets/asset-form-dialog').then((mod) => mod.AssetFormDialog),
  { ssr: false }
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
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban Board' }]} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                {selectedClient === 'all'
                  ? 'All Clients'
                  : clients.find((c) => c.id === selectedClient)?.name || 'Select Client'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem
                className={selectedClient === 'all' ? 'bg-primary/10' : ''}
                onSelect={() => setSelectedClient('all')}
              >
                All Clients
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  className={selectedClient === client.id ? 'bg-primary/10' : ''}
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
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Asset
              </Button>
            }
          />
        </div>
      </div>

      <KanbanBoard assets={filteredAssets} onStatusChange={handleStatusChange} />
    </div>
  );
}
