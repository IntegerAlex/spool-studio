'use client';

import { Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Search, Plus, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ClientListProps {
  clients: Client[];
  onCreated?: (client: Client) => void;
}

export function ClientList({ clients, onCreated }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.instagramHandle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <style>{`
        .clients-title {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: -0.025em !important;
          line-height: 1.25 !important;
        }
        .clients-subtitle {
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
          width: 100% !important;
        }
        .search-input::placeholder {
          color: var(--color-text-faint) !important;
        }
        .search-input:focus {
          border-color: var(--color-border-strong) !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.03) !important;
          outline: none !important;
        }
        .client-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .client-card {
          background-color: var(--color-bg-surface) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-lg) !important;
          padding: 20px !important;
          transition: all 140ms ease !important;
          display: block;
          box-shadow: none !important;
        }
        .client-card:hover {
          border-color: var(--color-border-strong) !important;
          background-color: var(--color-bg-overlay) !important;
        }
        .client-name {
          font-size: 15px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          letter-spacing: normal !important;
        }
        .client-handle {
          font-size: 12px !important;
          color: var(--color-text-faint) !important;
          margin-top: 2px !important;
        }
        .card-divider {
          height: 1px !important;
          background-color: var(--color-border) !important;
          margin: 14px 0 !important;
          border: none !important;
        }
        .stats-row {
          display: flex;
          justify-content: space-between;
        }
        .stats-label {
          font-size: 10.5px !important;
          font-weight: 500 !important;
          letter-spacing: 0.07em !important;
          color: var(--color-text-faint) !important;
          text-transform: uppercase !important;
        }
        .stats-val {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: var(--color-text-primary) !important;
          margin-top: 3px !important;
        }
        .progress-bar-container {
          background-color: var(--color-bg-overlay) !important;
          border-radius: 999px !important;
          height: 3px !important;
          margin-top: 6px !important;
          overflow: hidden;
          position: relative;
        }
        .progress-bar-fill {
          background-color: var(--color-border-strong);
          border-radius: 999px !important;
          height: 100% !important;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="clients-title">Clients</h1>
          <p className="clients-subtitle">Manage client profiles, deliverables, and team assignments</p>
        </div>
        
        <div className="search-container w-full lg:hidden">
          <Search className="search-icon" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full"
          />
        </div>
        <ClientFormDialog
          onSaved={onCreated}
          trigger={
            <Button variant="accent" className="add-client-btn">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          }
        />
      </div>

      <div className="search-container hidden lg:block">
        <Search className="search-icon" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="client-cards-grid">
        {filteredClients.map((client) => {
          const targetPosters = client.monthlyPostsTarget ?? 0;
          const completedPosters = client.completedPosters ?? 0;
          const posterProgress = targetPosters > 0 ? (completedPosters / targetPosters) * 100 : 100;

          const targetReels = client.monthlyReelsTarget ?? 0;
          const completedReels = client.completedReels ?? 0;
          const reelProgress = targetReels > 0 ? (completedReels / targetReels) * 100 : 100;

          let overallPct = 100;
          if (targetPosters > 0 && targetReels > 0) {
            overallPct = (posterProgress + reelProgress) / 2;
          } else if (targetPosters > 0) {
            overallPct = posterProgress;
          } else if (targetReels > 0) {
            overallPct = reelProgress;
          }

          const weeklyGoal = client.weeklyGoal ?? 0;
          const weeklyCompleted = client.weeklyCompleted ?? 0;
          const weeklyProgress = weeklyGoal > 0 ? (weeklyCompleted / weeklyGoal) * 100 : 100;

          const weeklyPosterGoal = client.weeklyPosterGoal ?? 0;
          const weeklyReelGoal = client.weeklyReelGoal ?? 0;
          const weeklyCompletedPosters = client.weeklyCompletedPosters ?? 0;
          const weeklyCompletedReels = client.weeklyCompletedReels ?? 0;

          const pendingApprovals = client.pendingApprovals ?? 0;
          const pendingRevisions = client.pendingRevisions ?? 0;

          let statusLabel = 'On Track';
          let statusColorClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          if (overallPct < 70) {
            statusLabel = 'Behind';
            statusColorClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
          } else if (overallPct < 90) {
            statusLabel = 'Attention';
            statusColorClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          }

          return (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
              <Card className="client-card shadow-none group">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="client-name truncate">{client.name}</h3>
                      <p className="client-handle truncate">
                        {client.instagramHandle || client.slug || 'No handle set'}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider', statusColorClass)}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="card-divider" />

                  {weeklyPosterGoal === 0 && weeklyReelGoal === 0 ? (
                    <div className="py-4 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center space-y-1">
                      <p className="text-[11px] font-semibold text-amber-500 flex items-center justify-center gap-1">
                        <span>⚠️</span> Weekly goals not configured
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        Configure goals in Client settings
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-[var(--color-text-secondary)]">Posters</span>
                          <span className="text-[var(--color-text-muted)] font-mono">
                            {weeklyCompletedPosters} / {weeklyPosterGoal}
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill transition-all duration-150"
                            style={{
                              width: `${weeklyPosterGoal > 0 ? Math.min(100, (weeklyCompletedPosters / weeklyPosterGoal) * 100) : 0}%`,
                              backgroundColor: weeklyPosterGoal > 0 && weeklyCompletedPosters > 0 ? '#3b82f6' : 'var(--color-border-strong)'
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-[var(--color-text-secondary)]">Reels</span>
                          <span className="text-[var(--color-text-muted)] font-mono">
                            {weeklyCompletedReels} / {weeklyReelGoal}
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill transition-all duration-150"
                            style={{
                              width: `${weeklyReelGoal > 0 ? Math.min(100, (weeklyCompletedReels / weeklyReelGoal) * 100) : 0}%`,
                              backgroundColor: weeklyReelGoal > 0 && weeklyCompletedReels > 0 ? '#ec4899' : 'var(--color-border-strong)'
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-[var(--color-text-secondary)]">Total Progress</span>
                          <span className="text-[var(--color-text-muted)] font-mono">
                            {weeklyCompleted} / {weeklyGoal} ({weeklyGoal > 0 ? Math.round((weeklyCompleted / weeklyGoal) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill transition-all duration-150"
                            style={{
                              width: `${weeklyGoal > 0 ? Math.min(100, (weeklyCompleted / weeklyGoal) * 100) : 0}%`,
                              backgroundColor: weeklyGoal > 0 && weeklyCompleted > 0 ? '#10b981' : 'var(--color-border-strong)'
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="card-divider" />

                  <div className="flex justify-between text-[11px] pt-0.5">
                    <div className="text-[var(--color-text-muted)]">
                      Pending Approvals: <span className={cn('font-semibold font-mono', pendingApprovals > 0 ? 'text-amber-400' : 'text-[var(--color-text-faint)]')}>{pendingApprovals}</span>
                    </div>
                    <div className="text-[var(--color-text-muted)]">
                      Pending Revisions: <span className={cn('font-semibold font-mono', pendingRevisions > 0 ? 'text-red-400' : 'text-[var(--color-text-faint)]')}>{pendingRevisions}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 pt-1">
                    <span className={cn('text-[12px] font-medium text-[var(--color-accent)]')}>
                      View <ArrowRight className="ml-1 inline-block h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-8 w-8 text-[var(--color-text-faint)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-[13px] font-normal text-[var(--color-text-muted)]">No clients found</p>
          <p className="text-[12px] text-[var(--color-text-faint)] mt-0.5">Add a new client to get started</p>
        </div>
      )}
    </div>
  );
}
