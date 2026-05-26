'use client';

import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isActive = true;
    const supabase = createBrowserSupabaseClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (isActive) {
        setUser(data.user ?? null);
      }
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'User';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'CO';

  const routeTitle = (() => {
    if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard';
    if (pathname.startsWith('/dashboard/assets/')) return 'Asset Details';
    if (pathname.startsWith('/dashboard/assets')) return 'Assets';
    if (pathname.startsWith('/dashboard/clients')) return 'Clients';
    if (pathname.startsWith('/dashboard/approvals')) return 'Approvals';
    if (pathname.startsWith('/dashboard/kanban')) return 'Kanban';
    if (pathname.startsWith('/dashboard/queue')) return 'Upload Queue';
    if (pathname.startsWith('/dashboard/calendar')) return 'Calendar';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    return title;
  })();

  return (
    <header 
      className={cn('fixed left-[220px] right-0 top-0 z-40 hidden items-center justify-between border-b px-6 lg:flex lg:w-[calc(100%-220px)]', className)}
      style={{
        height: '57px',
        backgroundColor: '#0f0f0f',
        borderColor: 'var(--color-border)',
        boxShadow: 'none',
      }}
    >
      <style>{`
        .topbar-breadcrumb {
          font-size: 12.5px;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
        }
        .topbar-breadcrumb-separator {
          color: var(--color-text-faint);
          margin: 0 8px;
        }
        .topbar-breadcrumb-current {
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        .topbar-search-container {
          position: relative;
          width: 220px;
        }
        .topbar-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 13px;
          height: 13px;
          color: var(--color-text-faint) !important;
          pointer-events: none;
        }
        .topbar-search-input {
          background-color: var(--color-bg-overlay) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          padding: 6px 12px 6px 30px !important;
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
          width: 100% !important;
          height: 30px !important;
          transition: all 120ms ease;
        }
        .topbar-search-input::placeholder {
          color: var(--color-text-faint) !important;
        }
        .topbar-search-input:focus {
          border-color: var(--color-border-strong) !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.04) !important;
        }
        .topbar-bell {
          color: var(--color-text-muted) !important;
          transition: color 120ms ease !important;
        }
        .topbar-bell:hover {
          color: var(--color-text-primary) !important;
          background-color: transparent !important;
        }
        .topbar-avatar {
          height: 28px !important;
          width: 28px !important;
          border-radius: 50% !important;
          background-color: var(--color-bg-overlay) !important;
          border: 1px solid var(--color-border) !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .topbar-avatar-fallback {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: var(--color-text-secondary) !important;
          background-color: transparent !important;
        }
      `}</style>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 topbar-breadcrumb">
          <span>Home</span>
          <span className="topbar-breadcrumb-separator">/</span>
          <span className="topbar-breadcrumb-current truncate">{routeTitle}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="topbar-search-container hidden md:flex">
          <Search className="topbar-search-icon" />
          <Input
            placeholder="Search..."
            className="topbar-search-input"
          />
        </div>

        <Button variant="ghost" size="icon" className="size-8 shrink-0 topbar-bell">
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Avatar className="topbar-avatar">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="topbar-avatar-fallback">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
