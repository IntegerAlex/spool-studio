'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dashboardApi } from '@/lib/api-client';
import Link from 'next/link';
import {
  Users,
  FileWarning,
  CheckCircle2,
  Upload,
  Clock3,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
} from 'lucide-react';

type DashboardSummary = Awaited<ReturnType<typeof dashboardApi.getSummary>>;
type ActivityItem = DashboardSummary['recentActivity'][number];

function getActivityIcon(entry: ActivityItem): React.ReactNode {
  if (entry.iconKind === 'client') {
    return <Users className="h-4 w-4 text-[#10b981]" />;
  }
  if (entry.iconKind === 'revision') {
    return <FileWarning className="h-4 w-4 text-[#f59e0b]" />;
  }
  if (entry.iconKind === 'approval') {
    return <CheckCircle2 className="h-4 w-4 text-[#10b981]" />;
  }
  if (entry.iconKind === 'publish') {
    return <Globe className="h-4 w-4 text-[#3b82f6]" />;
  }
  if (entry.iconKind === 'upload') {
    return <Upload className="h-4 w-4 text-[#3b82f6]" />;
  }

  return <Clock3 className="h-4 w-4 text-[#f59e0b]" />;
}

function getActivityBg(entry: ActivityItem): string {
  if (entry.iconKind === 'client') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (entry.iconKind === 'revision') {
    return 'bg-[rgba(245,158,11,0.14)]';
  }
  if (entry.iconKind === 'approval') {
    return 'bg-[rgba(16,185,129,0.14)]';
  }
  if (entry.iconKind === 'publish') {
    return 'bg-[rgba(59,130,246,0.14)]';
  }
  if (entry.iconKind === 'upload') {
    return 'bg-[rgba(59,130,246,0.14)]';
  }

  return 'bg-[rgba(245,158,11,0.14)]';
}

export default function LogsPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaryData = await dashboardApi.getSummary();
      setActivities(summaryData.recentActivity ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activities';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // 1. Search filter
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const titleMatch = activity.title?.toLowerCase().includes(query);
        const detailMatch = activity.detail?.toLowerCase().includes(query);
        if (!titleMatch && !detailMatch) {
          return false;
        }
      }

      // 2. Type filter
      if (typeFilter !== 'all') {
        if (activity.iconKind !== typeFilter) {
          return false;
        }
      }

      // 3. Date filter
      if (dateFilter !== 'all') {
        const timestamp = new Date(activity.timestamp);
        const today = new Date();
        
        if (dateFilter === 'today') {
          if (timestamp.toDateString() !== today.toDateString()) {
            return false;
          }
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          if (timestamp.toDateString() !== yesterday.toDateString()) {
            return false;
          }
        } else if (dateFilter === 'this_week') {
          const weekStart = new Date(today);
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
          weekStart.setDate(diff);
          weekStart.setHours(0, 0, 0, 0);
          if (timestamp.getTime() < weekStart.getTime()) {
            return false;
          }
        } else if (dateFilter === 'this_month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          if (timestamp.getTime() < monthStart.getTime()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [activities, searchQuery, typeFilter, dateFilter]);

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage));

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, dateFilter]);

  // Paginated activities
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredActivities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredActivities, currentPage, itemsPerPage]);

  function formatDateTime(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  return (
    <div className="space-y-6 logs-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .logs-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .logs-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .logs-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
        }
        .filter-panel {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 16px 20px !important;
          box-shadow: none !important;
        }
        .logs-input {
          background-color: var(--color-bg-app) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-primary) !important;
          font-size: 13px !important;
        }
        .logs-select {
          background-color: var(--color-bg-app) !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-primary) !important;
          font-size: 13px !important;
          height: 38px;
          border-radius: var(--radius-sm);
          padding: 0 12px;
          outline: none;
          min-width: 150px;
        }
        .logs-select:focus {
          border-color: var(--color-border-strong);
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
          padding: 14px 20px !important;
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
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid var(--color-border);
          background-color: var(--color-bg-overlay);
        }
        .pagination-btn {
          background-color: transparent !important;
          border: 1px solid var(--color-border) !important;
          color: var(--color-text-primary) !important;
          font-size: 12.5px !important;
          border-radius: var(--radius-sm) !important;
          padding: 6px 14px !important;
          transition: all 120ms ease !important;
          height: auto !important;
          box-shadow: none !important;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .pagination-btn:hover:not(:disabled) {
          background-color: var(--color-bg-hover) !important;
          border-color: var(--color-border-strong) !important;
        }
        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Logs' }]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="logs-title">System Activity Logs</h1>
          <p className="logs-subtitle">Audit trail of content operations, asset revisions, approvals, and actions</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { void loadData(); }}
          className="logs-btn flex items-center gap-2 self-start sm:self-center"
          style={{ height: '38px', fontSize: '13px' }}
        >
          <RefreshCw className={isLoading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Options */}
      <Card className="filter-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <Input
              placeholder="Search by client or asset name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="logs-input pl-9"
              style={{ height: '38px' }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="logs-select"
              >
                <option value="all">All Activities</option>
                <option value="upload">Upload</option>
                <option value="revision">Revision</option>
                <option value="approval">Approval</option>
                <option value="publish">Publish</option>
                <option value="client">Client</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">Date</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="logs-select"
              >
                <option value="all">Anytime</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table / List */}
      <div className="table-list-container">
        <div className="table-header-row">
          <div className="w-8 header-cell text-center">Event</div>
          <div className="flex-1 header-cell">Description</div>
          <div className="w-48 header-cell hidden sm:block">Category</div>
          <div className="w-56 header-cell text-right">Timestamp</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-[var(--color-text-muted)]">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-red-400">Error: {error}</p>
          </div>
        ) : paginatedActivities.length > 0 ? (
          <div>
            {paginatedActivities.map((entry) => (
              <div key={entry.id} className="table-row-item">
                <div className="w-8 flex items-center justify-center shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getActivityBg(entry)}`}>
                    {getActivityIcon(entry)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={entry.href} className="hover:underline font-semibold text-[var(--color-text-primary)] block truncate">
                    {entry.title}
                  </Link>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 truncate">{entry.detail}</p>
                </div>

                <div className="w-48 shrink-0 hidden sm:block">
                  <span className="text-[12px] capitalize px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] text-[var(--color-text-secondary)]">
                    {entry.iconKind === 'client' ? 'client workspace' : entry.iconKind}
                  </span>
                </div>

                <div className="w-56 shrink-0 text-right text-[12px] text-[var(--color-text-muted)]">
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            <div className="pagination-container">
              <div className="text-[12.5px] text-[var(--color-text-muted)]">
                Showing <span className="font-semibold text-[var(--color-text-secondary)]">{Math.min(filteredActivities.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                <span className="font-semibold text-[var(--color-text-secondary)]">{Math.min(filteredActivities.length, currentPage * itemsPerPage)}</span> of{' '}
                <span className="font-semibold text-[var(--color-text-secondary)]">{filteredActivities.length}</span> activities
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <div className="text-[12.5px] text-[var(--color-text-muted)] px-2">
                  Page <span className="font-semibold text-[var(--color-text-secondary)]">{currentPage}</span> of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="h-10 w-10 text-[var(--color-text-faint)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-[14px] font-medium text-[var(--color-text-secondary)]">No activities found</p>
            <p className="text-[12px] text-[var(--color-text-faint)] mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
}
