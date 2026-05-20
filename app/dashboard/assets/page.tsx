'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { AssetCard } from '@/components/assets/asset-card';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { assetsApi } from '@/lib/api-client';
import { Asset, AssetStatus } from '@/types/index';
import { Search, Plus, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const statuses: AssetStatus[] = [
  'draft',
  'in_design',
  'ready_for_review',
  'revision_requested',
  'approved',
  'scheduled',
  'uploaded',
  'archived',
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'all'>('all');

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setError(null);
        const data = await assetsApi.getAll();
        setAssets(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load assets';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assets' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assets' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Assets' }]} />

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
                <Filter className="w-4 h-4 mr-2" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem
                className={selectedStatus === 'all' ? 'bg-primary/10' : ''}
                onSelect={() => setSelectedStatus('all')}
              >
                All Assets
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {statuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  className={selectedStatus === status ? 'bg-primary/10' : ''}
                  onSelect={() => setSelectedStatus(status)}
                >
                  {status.replace(/_/g, ' ')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found</p>
        </div>
      )}
    </div>
  );
}
