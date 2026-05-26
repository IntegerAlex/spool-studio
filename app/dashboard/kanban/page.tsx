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
import { cn } from '@/lib/utils';

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
    <div className="space-y-6 kanban-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '24px 32px' }}>
      <style>{`
        .kanban-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .kanban-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .kanban-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
        }
        .top-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .search-container {
          position: relative;
          width: 280px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-faint) !important;
          pointer-events: none;
          width: 13px;
          height: 13px;
        }
        .search-input {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 14px 8px 34px !important;
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
          height: auto !important;
          transition: all 150ms ease !important;
          width: 100% !important;
        }
        .search-input::placeholder {
          color: var(--color-text-faint) !important;
        }
        .search-input:focus {
          border-color: var(--color-border-strong) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.03) !important;
          outline: none !important;
        }
        .filter-btn {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          height: auto !important;
          padding: 6px 14px !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 150ms ease !important;
          box-shadow: none !important;
        }
        .filter-btn:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-secondary) !important;
        }
        .filter-btn.active {
          border-color: var(--color-border-strong) !important;
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-overlay) !important;
        }
        .new-asset-btn {
          background: #3ecf8e !important;
          color: #000000 !important;
          font-size: 12.5px !important;
          font-weight: 600 !important;
          border-radius: var(--radius-sm) !important;
          padding: 8px 16px !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: all 120ms ease !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: auto !important;
        }
        .new-asset-btn:hover {
          opacity: 0.88 !important;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban Board' }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="kanban-title">Kanban Board</h1>
          <p className="kanban-subtitle">Track and coordinate deliverable status changes</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="search-container">
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
              <Button className="new-asset-btn">
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
