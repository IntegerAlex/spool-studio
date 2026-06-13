'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
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
import { usersApi } from '@/lib/api-client';
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Request failed');
  const envelope = await response.json() as { data?: T; error?: string };
  if (envelope.error) throw new Error(envelope.error);
  return envelope.data as T;
}

function hydrateAssetDates(asset: Asset): Asset {
  return {
    ...asset,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
    uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt) : null,
    scheduledAt: asset.scheduledAt ? new Date(asset.scheduledAt) : null,
    publishedAt: asset.publishedAt ? new Date(asset.publishedAt) : null,
    approvedAt: asset.approvedAt ? new Date(asset.approvedAt) : null,
    calendarSyncedAt: asset.calendarSyncedAt ? new Date(asset.calendarSyncedAt) : null,
  };
}

function hydrateClientDates(client: Client): Client {
  return {
    ...client,
    createdAt: client.createdAt ? new Date(client.createdAt as unknown as string) : undefined,
    updatedAt: client.updatedAt ? new Date(client.updatedAt as unknown as string) : undefined,
  };
}

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
  const { data: rawAssets, error: assetsError, isLoading: assetsLoading } = useSWR<Asset[]>('/api/assets', fetchJson);
  const { data: rawClients, error: clientsError, isLoading: clientsLoading } = useSWR<Client[]>('/api/clients', fetchJson);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const assets = useMemo(() => (rawAssets ?? []).map(hydrateAssetDates), [rawAssets]);
  const clients = useMemo(() => (rawClients ?? []).map(hydrateClientDates), [rawClients]);
  const isLoading = assetsLoading || clientsLoading || usersLoading;
  const error = assetsError?.message ?? clientsError?.message ?? null;

  useEffect(() => {
    let isActive = true;
    usersApi.getAll()
      .then((data) => { if (isActive) setUsers(data); })
      .catch(() => {})
      .finally(() => { if (isActive) setUsersLoading(false); });
    return () => { isActive = false; };
  }, []);
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
        className="table-row-item"
      >
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#0f0f0f]">
            {asset.thumbnailUrl && previewType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnailUrl} alt={asset.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <AssetIcon className="h-5 w-5 text-[var(--color-text-faint)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--color-text-primary)]">{asset.title}</p>
            <p className="text-[11px] text-[var(--color-text-faint)] uppercase tracking-wider mt-0.5">{asset.fileExtension ?? asset.type}</p>
          </div>
        </div>

        <div className="w-32 shrink-0">
          <StatusBadge status={asset.status} />
        </div>

        <div className="w-32 shrink-0 text-[var(--color-text-secondary)] truncate">
          {clientName}
        </div>

        <div className="w-32 shrink-0 text-right text-[var(--color-text-muted)] text-[12px]">
          {formatRelativeTime(asset.updatedAt)}
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
    <div className="space-y-6 assets-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .assets-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .assets-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
        }
        .assets-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
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
          width: 100%;
        }
        .search-input::placeholder {
          color: var(--color-text-faint) !important;
        }
        .search-input:focus {
          border-color: var(--color-border-strong) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.03) !important;
          outline: none !important;
        }
        .table-list-container {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
        }
        .table-header-row {
          background-color: var(--color-bg-overlay) !important;
          border-bottom: 1px solid var(--color-border) !important;
          padding: 10px 20px !important;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-cell {
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.07em !important;
          text-transform: uppercase !important;
          color: var(--color-text-faint) !important;
        }
        .table-row-item {
          padding: 12px 20px !important;
          border-bottom: 1px solid var(--color-border) !important;
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none !important;
          transition: background-color 100ms ease !important;
        }
        .table-row-item:last-child {
          border-bottom: none !important;
        }
        .table-row-item:hover {
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="assets-title">Assets</h1>
          <p className="assets-subtitle">Manage and preview client content deliverables</p>
        </div>

        <div className="search-container w-full lg:hidden">
          <Search className="search-icon" />
          <Input
            placeholder="Search assets..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="search-input w-full"
          />
        </div>

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
            onSaved={(saved) => {
              mutate('/api/assets', (current) => [saved, ...(current ?? [])], false);
              mutate('/api/assets');
            }}
            trigger={
              <Button variant="accent" className="new-asset-btn">
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            }
          />
        </div>
      </div>

      <div className="search-container hidden lg:block">
        <Search className="search-icon" />
        <Input
          placeholder="Search assets..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="search-input"
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
          <div className="table-list-container overflow-x-auto w-full">
            <div className="min-w-[800px]">
              <div className="table-header-row">
                <div className="flex-1 header-cell min-w-[300px]">Asset</div>
                <div className="w-32 header-cell shrink-0">Status</div>
                <div className="w-32 header-cell shrink-0">Client</div>
                <div className="w-32 header-cell shrink-0 text-right">Updated</div>
              </div>
              <div>
                {visibleAssets.map((asset) => renderAssetRow(asset))}
              </div>
            </div>
          </div>
        )
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No assets yet</p>
          <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">Upload the first asset to start building the library</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[13px] font-normal text-[var(--color-text-muted)]">{emptyState.title}</p>
          <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">{emptyState.description}</p>
        </div>
      )}
    </div>
  );
}
