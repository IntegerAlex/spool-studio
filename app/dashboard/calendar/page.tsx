'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import ErrorBoundary from '@/components/ui/error-boundary';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/assets/status-badge';
import Link from 'next/link';

type ViewMode = 'month' | 'week' | 'day';

function getAssetPublishDate(asset: Asset): Date | null {
  if (asset.publishDate) {
    const timePart = asset.publishTime ? asset.publishTime : '00:00:00';
    const candidate = new Date(`${asset.publishDate}T${timePart}`);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  if (asset.scheduledAt) return asset.scheduledAt;
  if (asset.publishedAt) return asset.publishedAt;
  return null;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

function getHours(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetsData, clientsData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);
        setAssets(new Map(assetsData.map((a) => [a.id, a])));
        setClients(new Map(clientsData.map((c) => [c.id, c])));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const allAssets = useMemo(() => [...assets.values()], [assets]);

  const getAssetsForDate = useCallback((date: Date) => {
    const dateStr = formatDateKey(date);
    return allAssets.filter((asset) => {
      if (asset.status !== 'approved' && asset.status !== 'published' && asset.status !== 'scheduled') return false;
      const pubDate = getAssetPublishDate(asset);
      if (!pubDate) return false;
      return formatDateKey(pubDate) === dateStr;
    });
  }, [allAssets]);

  const getAssetsForHour = useCallback((date: Date, hour: number) => {
    const dateStr = formatDateKey(date);
    return allAssets.filter((asset) => {
      if (asset.status !== 'approved' && asset.status !== 'published' && asset.status !== 'scheduled') return false;
      const pubDate = getAssetPublishDate(asset);
      if (!pubDate) return false;
      if (formatDateKey(pubDate) !== dateStr) return false;
      return pubDate.getHours() === hour;
    });
  }, [allAssets]);

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const headerLabel = useMemo(() => {
    if (viewMode === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === 'week') {
      const dates = getWeekDates(currentDate);
      const start = dates[0];
      const end = dates[6];
      if (start.getMonth() === end.getMonth()) return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentDate, viewMode]);

  const publishingAssets = useMemo(() => allAssets.filter((a) => ['approved', 'published', 'scheduled'].includes(a.status)), [allAssets]);
  const upcomingApproved = useMemo(() => publishingAssets.filter((a) => a.status === 'approved').sort((a, b) => (getAssetPublishDate(a)?.getTime() ?? 0) - (getAssetPublishDate(b)?.getTime() ?? 0)).slice(0, 8), [publishingAssets]);
  const publishedHistory = useMemo(() => publishingAssets.filter((a) => a.status === 'published').sort((a, b) => (getAssetPublishDate(b)?.getTime() ?? 0) - (getAssetPublishDate(a)?.getTime() ?? 0)).slice(0, 8), [publishingAssets]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />
        <div className="text-center py-12"><p className="text-muted-foreground">Loading calendar...</p></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Calendar</h1>
            <p className="text-sm text-zinc-400 mt-1">Plan and schedule your deliverable publications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5">
              Today
            </Button>
            <div className="inline-flex rounded-md border border-white/10 bg-[#161616] p-0.5">
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'h-7 rounded-[5px] px-3 text-[11px] font-medium transition-all',
                    viewMode === mode ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-md border border-white/10 bg-[#161616] p-0.5">
              <button onClick={navigatePrev} className="h-7 w-7 flex items-center justify-center rounded-[5px] text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-medium text-white min-w-[140px] text-center">{headerLabel}</span>
              <button onClick={navigateNext} className="h-7 w-7 flex items-center justify-center rounded-[5px] text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
          <div className="xl:col-span-2">
            <AnimatePresence mode="wait">
              {viewMode === 'month' && (
                <motion.div key="month" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <MonthView currentDate={currentDate} getAssetsForDate={getAssetsForDate} onSelectDate={(d) => { setSelectedDate(d); setViewMode('day'); setCurrentDate(d); }} onSelectAsset={setSelectedAsset} clients={clients} />
                </motion.div>
              )}
              {viewMode === 'week' && (
                <motion.div key="week" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <WeekView currentDate={currentDate} getAssetsForHour={getAssetsForHour} getAssetsForDate={getAssetsForDate} onSelectAsset={setSelectedAsset} clients={clients} />
                </motion.div>
              )}
              {viewMode === 'day' && (
                <motion.div key="day" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <DayView currentDate={currentDate} getAssetsForHour={getAssetsForHour} onSelectAsset={setSelectedAsset} clients={clients} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <SidePanel title="Upcoming Approved" items={upcomingApproved} clients={clients} onSelect={setSelectedAsset} />
            <SidePanel title="Published History" items={publishedHistory} clients={clients} onSelect={setSelectedAsset} />
          </div>
        </div>

        <AnimatePresence>
          {selectedAsset && (
            <AssetDetailModal asset={selectedAsset} clients={clients} onClose={() => setSelectedAsset(null)} />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

function MonthView({ currentDate, getAssetsForDate, onSelectDate, onSelectAsset, clients }: { currentDate: Date; getAssetsForDate: (d: Date) => Asset[]; onSelectDate: (d: Date) => void; onSelectAsset: (a: Asset) => void; clients: Map<string, Client> }) {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const emptyDays = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="grid grid-cols-7 bg-white/[0.02] border-b border-white/[0.06]">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-white/[0.04] bg-white/[0.01]" />
        ))}
        {days.map((day) => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dayAssets = getAssetsForDate(date);
          const isToday = formatDateKey(date) === formatDateKey(new Date());

          return (
            <motion.div
              key={day}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
              className={cn(
                'min-h-[90px] border-b border-r border-white/[0.04] p-2 cursor-pointer transition-colors',
                isToday && 'bg-emerald-500/[0.04]'
              )}
              onClick={() => onSelectDate(date)}
            >
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium',
                isToday ? 'bg-emerald-500 text-white' : 'text-zinc-400'
              )}>
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {dayAssets.slice(0, 2).map((asset) => (
                  <motion.div
                    key={asset.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={(e) => { e.stopPropagation(); onSelectAsset(asset); }}
                    className="truncate rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/[0.08] cursor-pointer"
                  >
                    {asset.title}
                  </motion.div>
                ))}
                {dayAssets.length > 2 && (
                  <p className="text-[9px] text-zinc-500 pl-1">+{dayAssets.length - 2} more</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, getAssetsForHour, getAssetsForDate, onSelectAsset, clients }: { currentDate: Date; getAssetsForHour: (d: Date, h: number) => Asset[]; getAssetsForDate: (d: Date) => Asset[]; onSelectAsset: (a: Asset) => void; clients: Map<string, Client> }) {
  const weekDates = getWeekDates(currentDate);
  const hours = getHours();
  const todayKey = formatDateKey(new Date());

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06] bg-white/[0.02]">
        <div className="py-2" />
        {weekDates.map((date, i) => {
          const isToday = formatDateKey(date) === todayKey;
          return (
            <div key={i} className={cn('py-2 px-1 text-center border-l border-white/[0.04]', isToday && 'bg-emerald-500/[0.06]')}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{DAY_NAMES[i]}</p>
              <p className={cn('text-lg font-bold', isToday ? 'text-emerald-400' : 'text-white')}>{date.getDate()}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-white/[0.04] py-2 px-2 text-right">
              <span className="text-[10px] text-zinc-500 font-medium">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
            </div>
            {weekDates.map((date, di) => {
              const hourAssets = getAssetsForHour(date, hour);
              return (
                <div key={di} className="border-b border-l border-white/[0.04] min-h-[48px] p-1 hover:bg-white/[0.02] transition-colors">
                  {hourAssets.map((asset) => (
                    <motion.div
                      key={asset.id}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => onSelectAsset(asset)}
                      className="mb-0.5 cursor-pointer rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5"
                    >
                      <p className="text-[9px] font-medium text-emerald-300 truncate">{asset.title}</p>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ currentDate, getAssetsForHour, onSelectAsset, clients }: { currentDate: Date; getAssetsForHour: (d: Date, h: number) => Asset[]; onSelectAsset: (a: Asset) => void; clients: Map<string, Client> }) {
  const hours = getHours();
  const isToday = formatDateKey(currentDate) === formatDateKey(new Date());

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] overflow-hidden">
      <div className={cn('border-b border-white/[0.06] py-3 px-4', isToday && 'bg-emerald-500/[0.04]')}>
        <p className="text-sm font-semibold text-white">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
        <p className="text-xs text-zinc-400">{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourAssets = getAssetsForHour(currentDate, hour);
          return (
            <div key={hour} className="grid grid-cols-[70px_1fr] border-b border-white/[0.04] min-h-[56px]">
              <div className="py-3 px-3 text-right border-r border-white/[0.04]">
                <span className="text-[11px] text-zinc-500 font-medium">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
              </div>
              <div className="p-2 hover:bg-white/[0.02] transition-colors space-y-1">
                {hourAssets.length > 0 ? hourAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    onClick={() => onSelectAsset(asset)}
                    className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{asset.title}</p>
                      <p className="text-[11px] text-zinc-400">{clients.get(asset.clientId)?.name ?? 'Unknown client'}</p>
                    </div>
                    <StatusBadge status={asset.status} />
                  </motion.div>
                )) : (
                  <div className="h-full min-h-[40px]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SidePanel({ title, items, clients, onSelect }: { title: string; items: Asset[]; clients: Map<string, Client>; onSelect: (a: Asset) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[var(--color-bg-surface)] p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.length > 0 ? items.map((asset) => {
          const pubDate = getAssetPublishDate(asset);
          const client = clients.get(asset.clientId);
          return (
            <motion.div
              key={asset.id}
              whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}
              onClick={() => onSelect(asset)}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2.5 cursor-pointer transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate">{asset.title}</p>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {client?.name ?? 'Unknown'} · {pubDate ? pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                </p>
              </div>
              <StatusBadge status={asset.status} />
            </motion.div>
          );
        }) : (
          <p className="text-[12px] text-zinc-500 py-4 text-center">No items</p>
        )}
      </div>
    </div>
  );
}

function AssetDetailModal({ asset, clients, onClose }: { asset: Asset; clients: Map<string, Client>; onClose: () => void }) {
  const client = clients.get(asset.clientId);
  const pubDate = getAssetPublishDate(asset);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#161616] shadow-2xl overflow-hidden"
      >
        {asset.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnailUrl} alt={asset.title} className="h-40 w-full object-cover" />
        )}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">{asset.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">{client?.name ?? 'Unknown client'} · {asset.type}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</p>
              <div className="mt-1"><StatusBadge status={asset.status} /></div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Publish Date</p>
              <p className="text-sm text-white mt-1">{pubDate ? pubDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not scheduled'}</p>
            </div>
            {asset.publishTime && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Time</p>
                <p className="text-sm text-white mt-1">{asset.publishTime}</p>
              </div>
            )}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Created</p>
              <p className="text-sm text-white mt-1">{asset.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Link href={`/dashboard/assets/${asset.id}`} className="flex-1">
              <Button variant="accent" className="w-full h-9 text-xs">View Asset</Button>
            </Link>
            <Button variant="outline" onClick={onClose} className="h-9 text-xs border-white/10 bg-transparent text-zinc-300">Close</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
