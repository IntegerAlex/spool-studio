'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { queueApi, assetsApi, clientsApi } from '@/lib/api-client';
import { UploadQueue, Asset, Client } from '@/types/index';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 4)); // May 2024
  const [queue, setQueue] = useState<UploadQueue[]>([]);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [queueData, assetsData, clientsData] = await Promise.all([
          queueApi.getAll(),
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);

        setQueue(queueData);
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

  const getUploadsForDate = (date: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
      .toISOString()
      .split('T')[0];
    return queue.filter(
      (q) => new Date(q.scheduledDate).toISOString().split('T')[0] === dateStr
    );
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

  const getEventColorClasses = (assetType: Asset['type']) => {
    switch (assetType) {
      case 'reel':
        return 'bg-[rgba(99,102,241,0.14)] text-[#c7d2fe] border-[rgba(99,102,241,0.16)]';
      case 'poster':
        return 'bg-[rgba(16,185,129,0.14)] text-[#a7f3d0] border-[rgba(16,185,129,0.16)]';
      default:
        return 'bg-[rgba(245,158,11,0.14)] text-[#fde68a] border-[rgba(245,158,11,0.16)]';
    }
  };

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
            const uploads = getUploadsForDate(day);
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
                  {uploads.length > 0 && (
                    <div className="mt-auto space-y-1.5 pb-0.5">
                      <div className="space-y-1">
                        {uploads.slice(0, 2).map((upload) => {
                          const asset = assets.get(upload.assetId);
                          return (
                            <div
                              key={upload.id}
                              className={cn('flex h-[18px] items-center gap-1 rounded-full border px-2 text-[10px] font-medium', getEventColorClasses(asset?.type ?? 'poster'))}
                              title={asset?.title}
                            >
                              <span className="min-w-0 truncate">{asset?.title || 'Unknown asset'}</span>
                            </div>
                          );
                        })}
                      </div>
                      {uploads.length > 2 && (
                        <p className="text-[10px] text-[#71717a]">+{uploads.length - 2} more</p>
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
        <h3 className="mb-4 text-[13px] font-medium text-white">Upcoming Scheduled Uploads</h3>
        <div className="space-y-2">
          {queue
            .filter((q) => q.status === 'scheduled')
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .slice(0, 5)
            .map((item) => {
              const asset = assets.get(item.assetId);
              const client = asset ? clients.get(asset.clientId) : null;

              return (
                <div key={item.id} className="flex flex-col gap-2 rounded-[10px] border border-[rgba(255,255,255,0.05)] px-3 py-2 transition-colors hover:bg-[rgba(255,255,255,0.03)] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-white">{asset?.title || 'Unknown'}</p>
                    <p className="text-[12px] text-[#71717a]">
                      {client?.name || 'Unknown'} • {new Date(item.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="self-start rounded-full border border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#34d399] sm:self-auto">
                    {item.platform}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
