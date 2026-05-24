'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { AssetCard } from '@/components/assets/asset-card';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { StatusBadge } from '@/components/assets/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { assetsApi, clientsApi, usersApi } from '@/lib/api-client';
import { assetStatusLabels, assetStatusValues } from '@/lib/asset-workflow';
import { cn } from '@/lib/utils';
import { Asset, AssetStatus, AssetType, Client, User } from '@/types/index';
import {
  AssetDiscoveryContext,
  AssetDiscoveryFilters,
  AssetMetadataFilter,
  AssetQuickFilter,
  AssetSortMode,
  AssetUploadedDateFilter,
  assetMetadataLabels,
  assetQuickFilterLabels,
  assetSortLabels,
  assetUploadedDateLabels,
  countActiveFilters,
  filterAssets,
  getDiscoveryEmptyState,
  sortAssets,
} from '@/lib/asset-discovery';
import { Filter, Grid2X2, List, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { formatRelativeTime, getAssetIcon, getAssetPreviewType } from '@/lib/asset-display';

const assetTypes: AssetType[] = ['reel', 'poster'];
const statusOptions: AssetStatus[] = [...assetStatusValues];
const quickFilterOptions: AssetQuickFilter[] = [
  'videos',
  'images',
  'pdfs',
  'needs_review',
  'failed_uploads',
  'recently_uploaded',
];
const defaultStatus: AssetStatus | 'all' = 'all';
const defaultAssetType: AssetType | 'all' = 'all';
const defaultUploadedDate: AssetUploadedDateFilter = 'all';
const defaultMetadataFilter: AssetMetadataFilter = 'all';
const defaultSortMode: AssetSortMode = 'newest';
const quickFilterChips: Array<AssetQuickFilter | 'all'> = [
  'all',
  'videos',
  'images',
  'pdfs',
  'needs_review',
  'failed_uploads',
  'recently_uploaded',
];

function parseSizeMb(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 1024 * 1024);
}

function formatUserLabel(user: User | undefined): string {
  return user?.name ?? 'Unknown user';
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'all'>(defaultStatus);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | 'all'>(defaultAssetType);
  const [uploadedDateFilter, setUploadedDateFilter] = useState<AssetUploadedDateFilter>(defaultUploadedDate);
  const [selectedAssignedUserId, setSelectedAssignedUserId] = useState<string | 'all' | 'unassigned'>('all');
  const [minFileSizeMb, setMinFileSizeMb] = useState('');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('');
  const [metadataFilter, setMetadataFilter] = useState<AssetMetadataFilter>(defaultMetadataFilter);
  const [activeQuickFilters, setActiveQuickFilters] = useState<AssetQuickFilter[]>([]);
  const [sortMode, setSortMode] = useState<AssetSortMode>(defaultSortMode);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        setError(null);
        const [assetsData, clientsData, usersData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
          usersApi.getAll(),
        ]);

        if (!isActive) {
          return;
        }

        setAssets(assetsData);
        setClients(clientsData);
        setUsers(usersData);
      } catch (err) {
        if (!isActive) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load assets';
        setError(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchInput]);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const discoveryFilters = useMemo<AssetDiscoveryFilters>(
    () => ({
      searchQuery: debouncedSearchQuery,
      status: selectedStatus,
      assetType: selectedAssetType,
      uploadedDate: uploadedDateFilter,
      assignedUserId: selectedAssignedUserId,
      minFileSizeBytes: parseSizeMb(minFileSizeMb),
      maxFileSizeBytes: parseSizeMb(maxFileSizeMb),
      metadataFilter,
      quickFilters: activeQuickFilters,
      sortMode,
    }),
    [
      activeQuickFilters,
      debouncedSearchQuery,
      metadataFilter,
      maxFileSizeMb,
      minFileSizeMb,
      selectedAssetType,
      selectedAssignedUserId,
      selectedStatus,
      sortMode,
      uploadedDateFilter,
    ]
  );

  const queryContext = useMemo<AssetDiscoveryContext>(
    () => ({ clientsById, usersById }),
    [clientsById, usersById]
  );

  const visibleAssets = useMemo(() => {
    const filtered = filterAssets(assets, discoveryFilters, queryContext);
    return sortAssets(filtered, sortMode);
  }, [assets, discoveryFilters, queryContext, sortMode]);

  const activeFilterCount = useMemo(() => countActiveFilters(discoveryFilters), [discoveryFilters]);
  const emptyState = useMemo(
    () => getDiscoveryEmptyState(discoveryFilters, visibleAssets.length),
    [discoveryFilters, visibleAssets.length]
  );

  useEffect(() => {
    console.info('[assets][discovery]', {
      searchQuery: discoveryFilters.searchQuery,
      filterCount: activeFilterCount,
      resultCount: visibleAssets.length,
      sortMode: discoveryFilters.sortMode,
    });
  }, [activeFilterCount, discoveryFilters.searchQuery, discoveryFilters.sortMode, visibleAssets.length]);

  const toggleQuickFilter = (quickFilter: AssetQuickFilter) => {
    setActiveQuickFilters((current) =>
      current.includes(quickFilter)
        ? current.filter((value) => value !== quickFilter)
        : [...current, quickFilter]
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearchQuery('');
    setSelectedStatus(defaultStatus);
    setSelectedAssetType(defaultAssetType);
    setUploadedDateFilter(defaultUploadedDate);
    setSelectedAssignedUserId('all');
    setMinFileSizeMb('');
    setMaxFileSizeMb('');
    setMetadataFilter(defaultMetadataFilter);
    setActiveQuickFilters([]);
    setSortMode(defaultSortMode);
  };

  const renderFilterGrid = (compact: boolean) => (
    <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow status</p>
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as AssetStatus | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {assetStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asset type</p>
        <Select value={selectedAssetType} onValueChange={(value) => setSelectedAssetType(value as AssetType | 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            {assetTypes.map((assetType) => (
              <SelectItem key={assetType} value={assetType}>
                {assetType === 'reel' ? 'Reel' : 'Poster'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Uploaded date</p>
        <Select value={uploadedDateFilter} onValueChange={(value) => setUploadedDateFilter(value as AssetUploadedDateFilter)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any date" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(assetUploadedDateLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned user</p>
        <Select
          value={selectedAssignedUserId}
          onValueChange={(value) => setSelectedAssignedUserId(value as string | 'all' | 'unassigned')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any user</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {formatUserLabel(user)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</p>
        <Select
          value={metadataFilter}
          onValueChange={(value) => setMetadataFilter(value as AssetMetadataFilter)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any metadata state" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(assetMetadataLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">File size range</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="Min MB"
            value={minFileSizeMb}
            onChange={(event) => setMinFileSizeMb(event.target.value)}
          />
          <Input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="Max MB"
            value={maxFileSizeMb}
            onChange={(event) => setMaxFileSizeMb(event.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderQuickFilters = () => (
    <div className="flex flex-wrap gap-2">
      {quickFilterChips.map((quickFilter) => {
        const isAll = quickFilter === 'all';
        const isActive = isAll ? activeQuickFilters.length === 0 : activeQuickFilters.includes(quickFilter);

        return (
          <Button
            key={quickFilter}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isAll) {
                setActiveQuickFilters([]);
                return;
              }

              toggleQuickFilter(quickFilter);
            }}
            className={cn(
              'h-7 rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-[12px] text-[#a1a1aa] shadow-none hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white',
              isActive && 'border-[rgba(99,102,241,0.4)] bg-[rgba(99,102,241,0.15)] text-[#818cf8] hover:bg-[rgba(99,102,241,0.15)]'
            )}
          >
            {isAll ? 'All' : assetQuickFilterLabels[quickFilter]}
          </Button>
        );
      })}
    </div>
  );

  const renderAssetRow = (asset: Asset) => {
    const AssetIcon = getAssetIcon(asset);
    const previewType = getAssetPreviewType(asset);
    const clientName = clientsById.get(asset.clientId)?.name ?? 'Unknown client';

    return (
      <Link
        key={asset.id}
        href={`/dashboard/assets/${asset.id}`}
        className="group flex items-center gap-4 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-3 transition-colors duration-150 hover:border-[rgba(255,255,255,0.18)] hover:bg-[#1a1a1a]"
      >
        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#0f0f0f]">
          {asset.thumbnailUrl && previewType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <AssetIcon className="h-7 w-7 text-[#71717a]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{asset.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-[18px] items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2 text-[10px] uppercase tracking-wide text-[#a1a1aa]">
              {asset.fileExtension ?? asset.mimeType?.split('/').pop() ?? asset.type}
            </span>
            <StatusBadge status={asset.status} />
          </div>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-[12px] text-[#a1a1aa]">{clientName}</p>
          <p className="mt-1 text-[12px] text-[#71717a]">{formatRelativeTime(asset.updatedAt)}</p>
        </div>
      </Link>
    );
  };

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[18px] font-medium text-white sm:text-[20px]">Assets</h1>

        <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
          <div className="inline-flex rounded-md border border-[rgba(255,255,255,0.08)] bg-[#161616] p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-[30px] w-[30px] rounded-[6px] text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white',
                viewMode === 'grid' && 'bg-[rgba(255,255,255,0.06)] text-white'
              )}
              aria-label="Grid view"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-[30px] w-[30px] rounded-[6px] text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white',
                viewMode === 'list' && 'bg-[rgba(255,255,255,0.06)] text-white'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as AssetSortMode)}>
            <SelectTrigger className="h-[34px] w-full border-[rgba(255,255,255,0.08)] bg-[#161616] px-3 text-[13px] text-white shadow-none hover:border-[rgba(255,255,255,0.12)] sm:w-[11rem]">
              <SlidersHorizontal className="h-4 w-4 text-[#71717a]" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(assetSortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-[34px] w-full rounded-md border-[rgba(255,255,255,0.1)] bg-transparent px-3 text-[13px] text-white shadow-none hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)] sm:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[95vw] max-w-lg overflow-y-auto border-l border-[rgba(255,255,255,0.08)] bg-[#161616] text-white">
              <SheetHeader>
                <SheetTitle>Asset filters</SheetTitle>
                <SheetDescription className="text-[#71717a]">
                  Narrow the asset library by workflow, metadata, size, and recency.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#71717a]">Sort</p>
                  <Select value={sortMode} onValueChange={(value) => setSortMode(value as AssetSortMode)}>
                    <SelectTrigger className="h-[34px] w-full border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] text-[13px] text-white shadow-none">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(assetSortLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderFilterGrid(true)}

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#71717a]">Quick filters</p>
                  {renderQuickFilters()}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]" onClick={clearFilters}>
                    Clear all
                  </Button>
                  <Button className="flex-1 bg-[var(--primary)] text-white hover:bg-[#4f46e5]" onClick={() => setMobileFiltersOpen(false)}>
                    Apply filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <AssetFormDialog
            mode="create"
            onSaved={(asset) => setAssets((prev) => [asset, ...prev])}
            trigger={
              <Button className="h-[34px] w-full rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5] sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            }
          />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
        <Input
          placeholder="Search title, client, type, mime type, filename..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="h-9 border-[rgba(255,255,255,0.08)] bg-[#161616] pl-10 text-[13px] text-white placeholder:text-[#52525b] focus-visible:border-[rgba(99,102,241,0.4)] focus-visible:ring-0"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">{renderQuickFilters()}</div>

      {visibleAssets.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2 xl:grid-cols-4">
            {visibleAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAssets.map((asset) => renderAssetRow(asset))}
          </div>
        )
      ) : assets.length === 0 ? (
        <Empty className="border-0 bg-[#161616]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Plus className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No assets yet</EmptyTitle>
            <EmptyDescription className="text-[#71717a]">Upload the first asset to start building the library.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AssetFormDialog
              mode="create"
              onSaved={(asset) => setAssets((prev) => [asset, ...prev])}
              trigger={
                <Button className="bg-[var(--primary)] text-white hover:bg-[#4f46e5]">
                  <Plus className="mr-2 h-4 w-4" />
                  New Asset
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <Empty className="border-0 bg-[#161616]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{emptyState.title}</EmptyTitle>
            <EmptyDescription className="text-[#71717a]">{emptyState.description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters} className="border-[rgba(255,255,255,0.1)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]">
                Clear filters
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
