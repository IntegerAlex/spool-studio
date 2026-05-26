'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Image as ImageIcon,
  CheckSquare,
  Calendar,
  Settings,
  Upload,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'Clients',
    href: '/dashboard/clients',
    icon: Users,
  },
  {
    label: 'Assets',
    href: '/dashboard/assets',
    icon: ImageIcon,
  },
  {
    label: 'Approvals',
    href: '/dashboard/approvals',
    icon: CheckSquare,
  },
  {
    label: 'Kanban',
    href: '/dashboard/kanban',
    icon: BarChart3,
  },
  {
    label: 'Upload Queue',
    href: '/dashboard/queue',
    icon: Upload,
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: Calendar,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  variant?: 'desktop' | 'drawer';
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'desktop', onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  const initials = useMemo(() => {
    const source =
      user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'CO';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'CO';
  }, [user]);

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const baseAsideClassName = cn(
    'flex h-full min-w-0 flex-col overflow-hidden',
    variant === 'desktop'
      ? 'hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-[220px]'
      : 'w-full'
  );

  return (
    <aside
      className={baseAsideClassName}
      style={{
        backgroundColor: '#0f0f0f',
        borderRight: '1px solid var(--color-border)',
        padding: '0',
        height: '100vh',
      }}
    >
      <style>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-muted) !important;
          cursor: pointer;
          transition: all 120ms ease;
          background: transparent !important;
          border: none !important;
          width: 100%;
          text-align: left;
          height: auto;
        }
        .nav-item:hover {
          background-color: var(--color-bg-hover) !important;
          color: var(--color-text-secondary) !important;
        }
        .nav-item.active {
          background-color: var(--color-bg-active) !important;
          color: var(--color-text-primary) !important;
          font-weight: 500;
        }
        .nav-icon {
          height: 15px !important;
          width: 15px !important;
          color: inherit;
          opacity: 0.7;
          transition: all 120ms ease;
        }
        .nav-item:hover .nav-icon {
          opacity: 1;
        }
        .nav-item.active .nav-icon {
          color: var(--color-text-primary);
          opacity: 1;
        }
        .signout-btn {
          font-size: 12px !important;
          color: var(--color-text-faint) !important;
          transition: color 120ms !important;
          background: transparent !important;
          padding: 4px 6px !important;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          justify-content: flex-start;
          cursor: pointer;
        }
        .signout-btn:hover {
          color: var(--color-text-secondary) !important;
          background: transparent !important;
        }
      `}</style>

      <div 
        className="flex items-center px-5" 
        style={{ 
          height: '57px', 
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#0f0f0f'
        }}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center">
          <Image
            src="/asset_flow.png"
            alt="Asset Flow"
            width={240}
            height={72}
            priority
            className="h-10 w-auto shrink-0 object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-[10px] py-3 min-w-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn('nav-item', isActive && 'active')}
                onClick={onNavigate}
              >
                <Icon className="nav-icon shrink-0" />
                <span className="min-w-0 truncate leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div
        className="space-y-3 min-w-0"
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '12px 10px',
          marginTop: 'auto',
        }}
      >
        <div className="flex items-center gap-[10px] px-1">
          <Avatar 
            className="border"
            style={{
              height: '26px',
              width: '26px',
              backgroundColor: 'var(--color-bg-overlay)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <AvatarFallback 
              style={{
                backgroundColor: 'transparent',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--color-text-secondary)',
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <span 
            className="truncate" 
            style={{
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
        <Button
          onClick={async () => {
            onNavigate?.();
            await handleLogout();
          }}
          variant="ghost"
          className="signout-btn"
        >
          <LogOut className="h-[14px] w-[14px]" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
