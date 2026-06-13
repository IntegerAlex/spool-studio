'use client';

import { useMemo } from 'react';
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
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navigationSections = [
  {
    title: 'WORKSPACE',
    items: [
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
    ],
  },
  {
    title: 'WORKFLOW',
    items: [
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
        label: 'Logs',
        href: '/dashboard/logs',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  variant?: 'desktop' | 'drawer';
  onNavigate?: () => void;
  user?: User | null;
}

export function Sidebar({ variant = 'desktop', onNavigate, user = null }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const displayName = useMemo(() => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  }, [user]);

  const initials = useMemo(() => {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'CO';
  }, [displayName]);

  const userRole = useMemo(() => {
    const rawRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (rawRole) {
      return rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
    }
    if (user?.email?.includes('admin')) return 'Administrator';
    return 'Agency Partner';
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
      ? 'hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-[240px]'
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
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 12.5px;
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
          font-weight: 600;
          box-shadow: inset 3px 0 0 0 var(--color-text-primary);
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
          font-size: 12.5px !important;
          color: var(--color-text-muted) !important;
          transition: all 120ms ease !important;
          padding: 8px 12px !important;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          justify-content: center;
          cursor: pointer;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-sm) !important;
          background-color: transparent !important;
        }
        .signout-btn:hover {
          color: var(--color-text-primary) !important;
          background-color: var(--color-bg-hover) !important;
          border-color: var(--color-border-strong) !important;
        }
      `}</style>

      <div 
        className="flex items-center justify-center px-4" 
        style={{ 
          height: '96px', 
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#0f0f0f',
        }}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center justify-center h-full w-full">
          <div className="relative flex items-center justify-center h-full w-full">
            <Image
              src="/asset_flow.png"
              alt="Asset Flow"
              width={260}
              height={78}
              priority
              className="h-[76px] w-auto shrink-0 object-contain"
            />
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-[14px] py-4 min-w-0 space-y-4">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h4 className="px-3 text-[10px] font-semibold tracking-wider text-[var(--color-text-faint)] uppercase opacity-75">
              {section.title}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>

      <div
        className="space-y-4 min-w-0"
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '16px 14px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          marginTop: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
        }}
      >
        <div className="flex items-center gap-[12px] px-1.5">
          <Avatar 
            className="border"
            style={{
              height: '40px',
              width: '40px',
              backgroundColor: 'var(--color-bg-overlay)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <AvatarFallback 
              style={{
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-text-secondary)',
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span 
              className="truncate" 
              style={{
                fontSize: '13.5px',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </span>
            <span 
              className="truncate" 
              style={{
                fontSize: '11px',
                color: 'var(--color-text-faint)',
                fontWeight: 400,
                marginTop: '2px',
              }}
            >
              {userRole}
            </span>
          </div>
        </div>
        <Button
          onClick={async () => {
            onNavigate?.();
            await handleLogout();
          }}
          variant="ghost"
          className="signout-btn min-h-[44px] sm:min-h-0"
        >
          <LogOut className="h-[14px] w-[14px]" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
