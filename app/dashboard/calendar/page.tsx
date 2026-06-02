'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import ErrorBoundary from '@/components/ui/error-boundary';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/assets/status-badge';

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
    <ErrorBoundary>
      <div className="space-y-6 calendar-page-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <style>{`
        .calendar-page-container {
          background-color: var(--color-bg-app);
          max-width: none !important;
        }
        .calendar-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .calendar-subtitle {
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          margin-top: 3px !important;
        }
        .calendar-grid-container {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
        }
        .days-header-row {
          background-color: var(--color-bg-overlay) !important;
          border-bottom: 1px solid var(--color-border) !important;
          padding: 10px !important;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .day-header-cell {
          font-size: 11px !important;
          font-weight: 600 !important;
          letter-spacing: 0.07em !important;
          text-transform: uppercase !important;
          color: var(--color-text-faint) !important;
          text-align: center !important;
        }
        .calendar-cells-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .date-cell {
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 10px !important;
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          background-color: transparent !important;
          transition: background-color 100ms ease;
        }
        .date-cell:hover {
          background-color: var(--color-bg-hover) !important;
        }
        .date-cell:nth-child(7n) {
          border-right: none !important;
        }
        .date-number {
          font-size: 12px !important;
          color: var(--color-text-muted) !important;
          width: fit-content;
          display: inline-block;
        }
        .today-date {
          color: var(--color-text-primary) !important;
          font-weight: 600 !important;
          background-color: var(--color-bg-hover) !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
        }
        .nav-btn {
          background-color: transparent !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 6px 10px !important;
          color: var(--color-text-muted) !important;
          height: auto !important;
          transition: all 120ms ease !important;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .nav-btn:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-primary) !important;
        }
        .month-year-label {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
        }
        .side-panel-container {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 20px !important;
        }
        .panel-heading {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-bottom: 16px !important;
        }
        .history-row-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 12px !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-md) !important;
          background-color: transparent !important;
          transition: background-color 100ms ease !important;
        }
        .history-row-item:hover {
          background-color: var(--color-bg-hover) !important;
        }
      `}</style>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="calendar-title">Calendar</h1>
          <p className="calendar-subtitle">Plan and schedule your deliverable publications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        {/* Main Calendar Grid */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="month-year-label">{monthName}</span>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="nav-btn">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={handleNextMonth} className="nav-btn">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="calendar-grid-container">
            <div className="days-header-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="day-header-cell">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-cells-grid">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="date-cell" />
              ))}

              {days.map((day) => {
                const assetsForDay = getAssetsForDate(day);
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                return (
                  <div key={day} className="date-cell">
                    <div className="flex h-full flex-col">
                      <div>
                        <span className={cn('date-number', isToday && 'today-date')}>
                          {day}
                        </span>
                      </div>
                      {assetsForDay.length > 0 && (
                        <div className="mt-auto space-y-1.5 pb-0.5">
                          <div className="space-y-1">
                            {assetsForDay.slice(0, 2).map((asset) => (
                              <div key={asset.id} className="flex justify-start">
                                <StatusBadge status={asset.status} className="w-full justify-start truncate" />
                              </div>
                            ))}
                          </div>
                          {assetsForDay.length > 2 && (
                            <p className="text-[10px] text-[var(--color-text-muted)]">+{assetsForDay.length - 2} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Info Panels */}
        <div className="space-y-6">
          <div className="side-panel-container">
            <h3 className="panel-heading">Upcoming Approved Posts</h3>
            <div className="space-y-2">
              {upcomingApproved.length > 0 ? (
                upcomingApproved.map((asset) => {
                  const client = clients.get(asset.clientId);
                  const publishDate = getAssetPublishDate(asset);

                  return (
                    <div key={asset.id} className="history-row-item sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{asset.title}</p>
                        <p className="text-[11.5px] text-[var(--color-text-faint)] truncate mt-0.5">
                          {client?.name || 'Unknown'} • {publishDate ? publishDate.toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <div className="shrink-0 self-start sm:self-auto">
                        <StatusBadge status={asset.status} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-[var(--color-text-faint)]">No upcoming approved posts scheduled</p>
              )}
            </div>
          </div>

          <div className="side-panel-container">
            <h3 className="panel-heading">Published History</h3>
            <div className="space-y-2">
              {publishedHistory.length > 0 ? (
                publishedHistory.map((asset) => {
                  const client = clients.get(asset.clientId);
                  const publishedAt = asset.publishedAt ?? getAssetPublishDate(asset);

                  return (
                    <div key={asset.id} className="history-row-item sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{asset.title}</p>
                        <p className="text-[11.5px] text-[var(--color-text-faint)] truncate mt-0.5">
                          {client?.name || 'Unknown'} • {publishedAt ? publishedAt.toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                      <div className="shrink-0 self-start sm:self-auto">
                        <StatusBadge status={asset.status} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[12px] text-[var(--color-text-faint)]">No published history available</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}
