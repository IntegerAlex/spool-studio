'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logsApi, AuditLogEntry } from '@/lib/api-client';
import Link from 'next/link';
import {
  Users,
  FileWarning,
  CheckCircle2,
  Upload,
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
  Settings,
  LogIn,
  LogOut,
  Trash2,
  Edit3,
  Eye,
  Shield,
  Activity,
} from 'lucide-react';

function getActionIcon(action: string): React.ReactNode {
  if (action.includes('login') || action.includes('auth')) return <LogIn className="h-4 w-4 text-emerald-400" />;
  if (action.includes('logout')) return <LogOut className="h-4 w-4 text-zinc-400" />;
  if (action.includes('upload') || action.includes('create') || action.includes('asset_created')) return <Upload className="h-4 w-4 text-blue-400" />;
  if (action.includes('revision')) return <FileWarning className="h-4 w-4 text-amber-400" />;
  if (action.includes('approve') || action.includes('published')) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (action.includes('delete') || action.includes('remove')) return <Trash2 className="h-4 w-4 text-red-400" />;
  if (action.includes('update') || action.includes('edit') || action.includes('change')) return <Edit3 className="h-4 w-4 text-blue-400" />;
  if (action.includes('status')) return <Activity className="h-4 w-4 text-purple-400" />;
  if (action.includes('client')) return <Users className="h-4 w-4 text-emerald-400" />;
  if (action.includes('setting') || action.includes('config')) return <Settings className="h-4 w-4 text-zinc-400" />;
  if (action.includes('view') || action.includes('read')) return <Eye className="h-4 w-4 text-zinc-400" />;
  if (action.includes('permission') || action.includes('role')) return <Shield className="h-4 w-4 text-amber-400" />;
  return <Globe className="h-4 w-4 text-zinc-400" />;
}

function getActionBg(action: string): string {
  if (action.includes('login') || action.includes('auth')) return 'bg-emerald-500/15';
  if (action.includes('upload') || action.includes('create')) return 'bg-blue-500/15';
  if (action.includes('revision')) return 'bg-amber-500/15';
  if (action.includes('approve') || action.includes('published')) return 'bg-emerald-500/15';
  if (action.includes('delete')) return 'bg-red-500/15';
  if (action.includes('update') || action.includes('edit')) return 'bg-blue-500/15';
  if (action.includes('status')) return 'bg-purple-500/15';
  return 'bg-zinc-500/15';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ACTION_FILTERS = [
  { value: 'all', label: 'All Actions' },
  { value: 'auth', label: 'Auth' },
  { value: 'asset', label: 'Assets' },
  { value: 'client', label: 'Clients' },
  { value: 'status', label: 'Status Changes' },
  { value: 'upload', label: 'Uploads' },
  { value: 'revision', label: 'Revisions' },
  { value: 'approval', label: 'Approvals' },
];

const ITEMS_PER_PAGE = 20;

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const getDateRange = useCallback(() => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString() };
    }
    if (dateFilter === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (dateFilter === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString() };
    }
    if (dateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString() };
    }
    return {};
  }, [dateFilter]);

  const getActionParam = useCallback(() => {
    if (actionFilter === 'all') return undefined;
    if (actionFilter === 'auth') return 'login';
    if (actionFilter === 'asset') return 'asset_created';
    if (actionFilter === 'client') return 'client_created';
    if (actionFilter === 'status') return 'status_changed';
    if (actionFilter === 'upload') return 'file_uploaded';
    if (actionFilter === 'revision') return 'revision_created';
    if (actionFilter === 'approval') return 'status_changed';
    return undefined;
  }, [actionFilter]);

  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const dateRange = getDateRange();
      const result = await logsApi.getAll({
        limit: ITEMS_PER_PAGE,
        offset,
        action: getActionParam(),
        search: searchQuery || undefined,
        ...dateRange,
      });
      setLogs(result.entries);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, getActionParam, getDateRange]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, actionFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="space-y-6" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Logs' }]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h1>
          <p className="text-sm text-zinc-400 mt-1">Complete system activity log with user actions, asset changes, and status transitions</p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadLogs()}
          className="flex items-center gap-2 self-start sm:self-center h-9 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
        >
          <RefreshCw className={isLoading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="border border-white/[0.06] bg-[var(--color-bg-surface)] p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search by entity name, user, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium">Action</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-300 outline-none focus:border-emerald-500/40"
              >
                {ACTION_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-medium">Date</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-300 outline-none focus:border-emerald-500/40"
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

      <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_140px_100px_140px] gap-3 bg-white/[0.02] border-b border-white/[0.06] px-4 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-center">Event</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Description</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hidden sm:block">User</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hidden md:block">Entity</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">When</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-6 w-6 text-zinc-600 animate-spin mb-3" />
            <p className="text-sm text-zinc-400">Loading audit trail...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : logs.length > 0 ? (
          <AnimatePresence>
            {logs.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                className="grid grid-cols-[44px_1fr_140px_100px_140px] gap-3 items-center px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getActionBg(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{formatAction(entry.action)}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {entry.entityName ? (
                      entry.entityType === 'asset' ? (
                        <Link href={`/dashboard/assets/${entry.entityId}`} className="hover:text-emerald-400 transition-colors">{entry.entityName}</Link>
                      ) : entry.entityType === 'client' ? (
                        <Link href={`/dashboard/clients/${entry.entityId}`} className="hover:text-emerald-400 transition-colors">{entry.entityName}</Link>
                      ) : (
                        entry.entityName
                      )
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </p>
                </div>

                <div className="hidden sm:block min-w-0">
                  <p className="text-[12px] text-zinc-400 truncate">{entry.userName || entry.userEmail || 'System'}</p>
                </div>

                <div className="hidden md:block">
                  <span className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-400 capitalize">
                    {entry.entityType}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-zinc-500" title={new Date(entry.createdAt).toLocaleString()}>
                    {formatRelativeTime(new Date(entry.createdAt))}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock3 className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-400">No audit logs found</p>
            <p className="text-xs text-zinc-600 mt-1">Activity will appear here as users interact with the system</p>
          </div>
        )}

        {total > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <p className="text-[12px] text-zinc-500">
              Showing <span className="font-medium text-zinc-400">{Math.min(total, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span>–<span className="font-medium text-zinc-400">{Math.min(total, currentPage * ITEMS_PER_PAGE)}</span> of <span className="font-medium text-zinc-400">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-lg border border-white/[0.08] bg-transparent text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-[12px] text-zinc-500 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-lg border border-white/[0.08] bg-transparent text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
