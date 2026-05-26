'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getAssetPublishDate(asset: Asset): Date | null {
  if (asset.publishDate) {
    const timePart = asset.publishTime ? asset.publishTime : '00:00:00';
    const candidate = new Date(`${asset.publishDate}T${timePart}`);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  if (asset.scheduledAt) {
    return asset.scheduledAt;
  }

  if (asset.publishedAt) {
    return asset.publishedAt;
  }

  return null;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getEventColorClasses(asset: Asset): string {
  const publishDate = getAssetPublishDate(asset);

  if (asset.status === 'published') {
    return 'bg-[rgba(16,185,129,0.14)] text-[#a7f3d0] border-[rgba(16,185,129,0.16)]';
  }

  if (publishDate && publishDate.getTime() < new Date().setHours(0, 0, 0, 0) && asset.status === 'approved') {
    return 'bg-[rgba(239,68,68,0.14)] text-[#fecaca] border-[rgba(239,68,68,0.18)]';
  }

  return 'bg-[rgba(59,130,246,0.14)] text-[#bfdbfe] border-[rgba(59,130,246,0.16)]';
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAssetsForDate = (date: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    const dateStr = formatDateKey(targetDate);

    return [...assets.values()].filter((asset) => {
      if (asset.status !== 'approved' && asset.status !== 'published') {
        return false;
      }

      const publishDate = getAssetPublishDate(asset);
      if (!publishDate) {
        return false;
      }

      return formatDateKey(publishDate) === dateStr;
    });
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const publishingAssets = [...assets.values()].filter(
    (asset) => asset.status === 'approved' || asset.status === 'published'
  );

  const publishedHistory = publishingAssets
    .filter((asset) => asset.status === 'published')
    .sort((left, right) => {
      const leftDate = getAssetPublishDate(left)?.getTime() ?? left.updatedAt.getTime();
      const rightDate = getAssetPublishDate(right)?.getTime() ?? right.updatedAt.getTime();
      return rightDate - leftDate;
    })
    .slice(0, 5);

  const upcomingApproved = publishingAssets
    .filter((asset) => asset.status === 'approved')
    .sort((left, right) => {
      const leftDate = getAssetPublishDate(left)?.getTime() ?? left.updatedAt.getTime();
      const rightDate = getAssetPublishDate(right)?.getTime() ?? right.updatedAt.getTime();
      return leftDate - rightDate;
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111111] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[16px] font-medium text-white">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 border-[rgba(255,255,255,0.08)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 border-[rgba(255,255,255,0.08)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-[11px] uppercase tracking-[0.18em] text-[#52525b]">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const assetsForDay = getAssetsForDate(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={cn(
                  'aspect-square rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#161616] p-2 transition-colors hover:bg-[#1a1a1a]',
                  isToday && 'border-[var(--primary)]'
                )}
              >
                <div className="flex h-full flex-col">
                  <p className={cn('text-[12px] font-medium', isToday ? 'text-[var(--primary)]' : 'text-white')}>
                    {day}
                  </p>
                  {assetsForDay.length > 0 && (
                    <div className="mt-auto space-y-1.5 pb-0.5">
                      <div className="space-y-1">
                        {assetsForDay.slice(0, 2).map((asset) => {
                          const publishDate = getAssetPublishDate(asset);
                          return (
                            <div
                              key={asset.id}
                              className={cn(
                                'flex h-[18px] items-center gap-1 rounded-full border px-2 text-[10px] font-medium',
                                getEventColorClasses(asset)
                              )}
                              title={asset.title}
                            >
                              <span className="min-w-0 truncate">{asset.title}</span>
                            </div>
                          );
                        })}
                      </div>
                      {assetsForDay.length > 2 && (
                        <p className="text-[10px] text-[#71717a]">+{assetsForDay.length - 2} more</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111111] p-4">
        <h3 className="mb-4 text-[13px] font-medium text-white">Upcoming Approved Posts</h3>
        <div className="space-y-2">
          {upcomingApproved.map((asset) => {
            const client = clients.get(asset.clientId);
            const publishDate = getAssetPublishDate(asset);

            return (
              <div key={asset.id} className="flex flex-col gap-2 rounded-[10px] border border-[rgba(255,255,255,0.05)] px-3 py-2 transition-colors hover:bg-[rgba(255,255,255,0.03)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-medium text-white">{asset.title}</p>
                  <p className="text-[12px] text-[#71717a]">
                    {client?.name || 'Unknown'} • {publishDate ? publishDate.toLocaleString() : 'No publish date'}
                  </p>
                </div>
                <span className="self-start rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#93c5fd] sm:self-auto">
                  Approved
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111111] p-4">
        <h3 className="mb-4 text-[13px] font-medium text-white">Published History</h3>
        <div className="space-y-2">
          {publishedHistory.map((asset) => {
            const client = clients.get(asset.clientId);
            const publishedAt = asset.publishedAt ?? getAssetPublishDate(asset);

            return (
              <div key={asset.id} className="flex flex-col gap-2 rounded-[10px] border border-[rgba(255,255,255,0.05)] px-3 py-2 transition-colors hover:bg-[rgba(255,255,255,0.03)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-medium text-white">{asset.title}</p>
                  <p className="text-[12px] text-[#71717a]">
                    {client?.name || 'Unknown'} • {publishedAt ? publishedAt.toLocaleString() : 'No publish date'}
                  </p>
                </div>
                <span className="self-start rounded-full border border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#34d399] sm:self-auto">
                  Published
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
