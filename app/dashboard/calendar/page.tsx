'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { queueApi, assetsApi, clientsApi } from '@/lib/api-client';
import { UploadQueue, Asset, Client } from '@/types/index';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

      <Card className="p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="border-border text-foreground hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="border-border text-foreground hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {days.map((day) => {
            const uploads = getUploadsForDate(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`aspect-square p-2 rounded-lg border-2 transition-colors ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                } ${uploads.length > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-card'}`}
              >
                <div className="h-full flex flex-col">
                  <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day}
                  </p>
                  {uploads.length > 0 && (
                    <div className="mt-auto">
                      <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                        {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1 mt-1">
                        {uploads.slice(0, 2).map((upload) => {
                          const asset = assets.get(upload.assetId);
                          return (
                            <p
                              key={upload.id}
                              className="text-xs text-foreground truncate bg-white dark:bg-black/20 px-1 py-0.5 rounded"
                              title={asset?.title}
                            >
                              {asset?.title.slice(0, 12)}...
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Scheduled Uploads</h3>
        <div className="space-y-3">
          {queue
            .filter((q) => q.status === 'scheduled')
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .slice(0, 5)
            .map((item) => {
              const asset = assets.get(item.assetId);
              const client = asset ? clients.get(asset.clientId) : null;

              return (
                <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-foreground text-sm">{asset?.title || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {client?.name || 'Unknown'} • {new Date(item.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    {item.platform}
                  </span>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
