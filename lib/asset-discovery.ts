import type { Asset, AssetStatus, AssetType, Client, User } from '@/types/index';
import { getAssetPreviewType } from '@/lib/asset-display';

export type AssetSortMode =
  | 'newest'
  | 'oldest'
  | 'recently_updated'
  | 'largest_file'
  | 'smallest_file'
  | 'alphabetical';

export type AssetUploadedDateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days';
export type AssetMetadataFilter = 'all' | 'has_metadata' | 'missing_metadata';
export type AssetQuickFilter =
  | 'videos'
  | 'images'
  | 'pdfs'
  | 'needs_review'
  | 'failed_uploads'
  | 'recently_uploaded';

export interface AssetDiscoveryFilters {
  searchQuery: string;
  status: AssetStatus | 'all';
  assetType: AssetType | 'all';
  uploadedDate: AssetUploadedDateFilter;
  assignedUserId: string | 'all' | 'unassigned';
  minFileSizeBytes: number | null;
  maxFileSizeBytes: number | null;
  metadataFilter: AssetMetadataFilter;
  quickFilters: AssetQuickFilter[];
  sortMode: AssetSortMode;
}

export interface AssetDiscoveryContext {
  clientsById: Map<string, Client>;
  usersById: Map<string, User>;
}

export const assetSortLabels: Record<AssetSortMode, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  recently_updated: 'Recently updated',
  largest_file: 'Largest file',
  smallest_file: 'Smallest file',
  alphabetical: 'Alphabetical',
};

export const assetUploadedDateLabels: Record<AssetUploadedDateFilter, string> = {
  all: 'Any time',
  today: 'Today',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
};

export const assetMetadataLabels: Record<AssetMetadataFilter, string> = {
  all: 'Any metadata state',
  has_metadata: 'Has metadata',
  missing_metadata: 'Needs metadata',
};

export const assetQuickFilterLabels: Record<AssetQuickFilter, string> = {
  videos: 'Videos',
  images: 'Images',
  pdfs: 'PDFs',
  needs_review: 'Needs Review',
  failed_uploads: 'Failed Uploads',
  recently_uploaded: 'Recently Uploaded',
};

const assetQuickFilterEmptyStateLabels: Record<AssetQuickFilter, string> = {
  videos: 'video assets',
  images: 'image assets',
  pdfs: 'PDF assets',
  needs_review: 'assets needing review',
  failed_uploads: 'failed upload assets',
  recently_uploaded: 'recently uploaded assets',
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSearchTerms(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean);
}

function getAssetFilename(asset: Asset): string {
  const source = asset.fileUrl ?? asset.driveFileUrl ?? asset.title;

  try {
    const url = new URL(source);
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();
    if (lastSegment) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    const fallback = source.split('/').filter(Boolean).pop();
    if (fallback) {
      return fallback;
    }
  }

  return asset.title;
}

function getSearchableText(asset: Asset, context: AssetDiscoveryContext): string {
  const clientName = context.clientsById.get(asset.clientId)?.name ?? '';
  const filename = getAssetFilename(asset);

  return normalizeText(
    [asset.title, clientName, asset.type, asset.mimeType ?? '', filename]
      .filter(Boolean)
      .join(' ')
  );
}

export function matchesSearchQuery(
  asset: Asset,
  query: string,
  context: AssetDiscoveryContext
): boolean {
  const terms = normalizeSearchTerms(query);
  if (terms.length === 0) {
    return true;
  }

  const searchableText = getSearchableText(asset, context);
  return terms.every((term) => searchableText.includes(term));
}

function getAssetTimestamp(asset: Asset): number {
  return (asset.uploadedAt ?? asset.createdAt).getTime();
}

function isWithinDays(asset: Asset, days: number): boolean {
  const value = asset.uploadedAt ?? asset.createdAt;
  const ageMs = Date.now() - value.getTime();
  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
}

function hasMetadata(asset: Asset): boolean {
  return [
    asset.mimeType,
    asset.fileSize,
    asset.fileExtension,
    asset.uploadedAt,
    asset.mediaWidth,
    asset.mediaHeight,
    asset.durationSeconds,
  ].some((value) => value !== null && value !== undefined);
}

function matchesQuickFilter(asset: Asset, quickFilter: AssetQuickFilter): boolean {
  switch (quickFilter) {
    case 'videos':
      return getAssetPreviewType(asset) === 'video';
    case 'images':
      return getAssetPreviewType(asset) === 'image';
    case 'pdfs':
      return getAssetPreviewType(asset) === 'document';
    case 'needs_review':
      return asset.status === 'ready_for_review' || asset.status === 'revision_requested';
    case 'failed_uploads':
      return asset.status === 'failed';
    case 'recently_uploaded':
      return isWithinDays(asset, 7);
    default:
      return true;
  }
}

function matchesUploadedDateFilter(asset: Asset, uploadedDate: AssetUploadedDateFilter): boolean {
  switch (uploadedDate) {
    case 'today':
      return isWithinDays(asset, 1);
    case 'last_7_days':
      return isWithinDays(asset, 7);
    case 'last_30_days':
      return isWithinDays(asset, 30);
    default:
      return true;
  }
}

function matchesMetadataFilter(asset: Asset, metadataFilter: AssetMetadataFilter): boolean {
  if (metadataFilter === 'all') {
    return true;
  }

  const metadataPresent = hasMetadata(asset);
  return metadataFilter === 'has_metadata' ? metadataPresent : !metadataPresent;
}

function matchesSizeRange(asset: Asset, minFileSizeBytes: number | null, maxFileSizeBytes: number | null): boolean {
  const fileSize = asset.fileSize;

  if (fileSize == null) {
    return minFileSizeBytes == null && maxFileSizeBytes == null;
  }

  if (minFileSizeBytes != null && fileSize < minFileSizeBytes) {
    return false;
  }

  if (maxFileSizeBytes != null && fileSize > maxFileSizeBytes) {
    return false;
  }

  return true;
}

function matchesAssignedUser(asset: Asset, assignedUserId: string | 'all' | 'unassigned'): boolean {
  if (assignedUserId === 'all') {
    return true;
  }

  const hasAssignees = asset.assignedTo.length > 0;
  if (assignedUserId === 'unassigned') {
    return !hasAssignees;
  }

  return asset.assignedTo.includes(assignedUserId);
}

function matchesAssetType(asset: Asset, assetType: AssetType | 'all'): boolean {
  return assetType === 'all' || asset.type === assetType;
}

function matchesStatus(asset: Asset, status: AssetStatus | 'all'): boolean {
  return status === 'all' || asset.status === status;
}

function matchesQuickFilters(asset: Asset, quickFilters: AssetQuickFilter[]): boolean {
  if (quickFilters.length === 0) {
    return true;
  }

  return quickFilters.some((quickFilter) => matchesQuickFilter(asset, quickFilter));
}

export function filterAssets(
  assets: Asset[],
  filters: AssetDiscoveryFilters,
  context: AssetDiscoveryContext
): Asset[] {
  return assets.filter((asset) => {
    return (
      matchesSearchQuery(asset, filters.searchQuery, context) &&
      matchesStatus(asset, filters.status) &&
      matchesAssetType(asset, filters.assetType) &&
      matchesUploadedDateFilter(asset, filters.uploadedDate) &&
      matchesAssignedUser(asset, filters.assignedUserId) &&
      matchesSizeRange(asset, filters.minFileSizeBytes, filters.maxFileSizeBytes) &&
      matchesMetadataFilter(asset, filters.metadataFilter) &&
      matchesQuickFilters(asset, filters.quickFilters)
    );
  });
}

export function sortAssets(assets: Asset[], sortMode: AssetSortMode): Asset[] {
  const sorted = [...assets];

  sorted.sort((left, right) => {
    switch (sortMode) {
      case 'oldest':
        return getAssetTimestamp(left) - getAssetTimestamp(right) || left.title.localeCompare(right.title);
      case 'recently_updated':
        return right.updatedAt.getTime() - left.updatedAt.getTime() || left.title.localeCompare(right.title);
      case 'largest_file':
        return (right.fileSize ?? -1) - (left.fileSize ?? -1) || left.title.localeCompare(right.title);
      case 'smallest_file':
        return (left.fileSize ?? Number.POSITIVE_INFINITY) - (right.fileSize ?? Number.POSITIVE_INFINITY) || left.title.localeCompare(right.title);
      case 'alphabetical':
        return left.title.localeCompare(right.title) || getAssetTimestamp(right) - getAssetTimestamp(left);
      case 'newest':
      default:
        return getAssetTimestamp(right) - getAssetTimestamp(left) || left.title.localeCompare(right.title);
    }
  });

  return sorted;
}

export function countActiveFilters(filters: AssetDiscoveryFilters): number {
  let count = 0;

  if (filters.searchQuery.trim().length > 0) {
    count += 1;
  }

  if (filters.status !== 'all') {
    count += 1;
  }

  if (filters.assetType !== 'all') {
    count += 1;
  }

  if (filters.uploadedDate !== 'all') {
    count += 1;
  }

  if (filters.assignedUserId !== 'all') {
    count += 1;
  }

  if (filters.minFileSizeBytes != null || filters.maxFileSizeBytes != null) {
    count += 1;
  }

  if (filters.metadataFilter !== 'all') {
    count += 1;
  }

  count += filters.quickFilters.length;

  return count;
}

function describeFileSizeRange(filters: AssetDiscoveryFilters): string | null {
  if (filters.minFileSizeBytes == null && filters.maxFileSizeBytes == null) {
    return null;
  }

  const toMb = (value: number) => `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;

  if (filters.minFileSizeBytes != null && filters.maxFileSizeBytes != null) {
    return `file size between ${toMb(filters.minFileSizeBytes)} and ${toMb(filters.maxFileSizeBytes)}`;
  }

  if (filters.minFileSizeBytes != null) {
    return `file size above ${toMb(filters.minFileSizeBytes)}`;
  }

  return `file size below ${toMb(filters.maxFileSizeBytes ?? 0)}`;
}

function describeUploadedDate(filters: AssetDiscoveryFilters): string | null {
  if (filters.uploadedDate === 'all') {
    return null;
  }

  return `uploaded ${assetUploadedDateLabels[filters.uploadedDate].toLowerCase()}`;
}

function assetStatusLabel(status: AssetStatus): string {
  return status.replace(/_/g, ' ');
}

export function getDiscoveryEmptyState(
  filters: AssetDiscoveryFilters,
  visibleAssetCount: number
): { title: string; description: string } {
  if (visibleAssetCount > 0) {
    return { title: '', description: '' };
  }

  const quickFilterDescriptor = filters.quickFilters[0]
    ? assetQuickFilterEmptyStateLabels[filters.quickFilters[0]]
    : null;
  const statusDescriptor = filters.status !== 'all' ? assetStatusLabel(filters.status) : null;
  const typeDescriptor = filters.assetType !== 'all' ? `${filters.assetType} assets` : null;
  const fileSizeDescriptor = describeFileSizeRange(filters);
  const dateDescriptor = describeUploadedDate(filters);

  const descriptor = quickFilterDescriptor ?? statusDescriptor ?? typeDescriptor;

  if (filters.status !== 'all') {
    const details = [
      fileSizeDescriptor,
      dateDescriptor,
      filters.metadataFilter !== 'all' ? assetMetadataLabels[filters.metadataFilter].toLowerCase() : null,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      title: `No ${assetStatusLabel(filters.status)} assets match current filters`,
      description: details
        ? `Try widening the current filters or clearing ${details}.`
        : 'Try widening the current filters or clearing the active chips.',
    };
  }

  if (descriptor) {
    const details = [
      fileSizeDescriptor,
      dateDescriptor,
      filters.metadataFilter !== 'all' ? assetMetadataLabels[filters.metadataFilter].toLowerCase() : null,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      title: `No ${descriptor} found`,
      description: details
        ? `Try widening the current filters or clearing ${details}.`
        : 'Try widening the current filters or clearing the active chips.',
    };
  }

  const fragments = [
    filters.searchQuery ? `"${filters.searchQuery}"` : null,
    filters.status !== 'all' ? assetStatusLabel(filters.status) : null,
    filters.assetType !== 'all' ? `${filters.assetType} assets` : null,
    filters.quickFilters.length > 0 ? `${filters.quickFilters.length} quick filter${filters.quickFilters.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);

  return {
    title: 'No assets match your filters',
    description: fragments.length > 0
      ? `No assets matched ${fragments.join(', ')}. Clear or adjust the active filters to broaden the result set.`
      : 'No assets match the current discovery filters.',
  };
}