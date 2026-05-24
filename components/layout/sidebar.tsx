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
      .map((part) => part[0]?.toUpperCase())
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
    'flex h-full flex-col border-r border-[rgba(255,255,255,0.06)] bg-[var(--sidebar)] px-[10px] py-[12px]',
    variant === 'desktop'
      ? 'hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-[220px]'
      : 'w-full'
  );

  return (
    <aside className={baseAsideClassName}>
      <div className="flex h-16 items-center px-2">
        <Link href="/dashboard" className="flex min-w-0 items-center">
          <Image
            src="/asset_flow.png"
            alt="Asset Flow"
            width={240}
            height={72}
            priority
            className="h-16 w-auto shrink-0 object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-1 py-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'group relative flex h-[34px] items-center gap-2 rounded-md px-2 text-[13px] transition-colors',
                  isActive
                    ? 'bg-[rgba(99,102,241,0.12)] text-white before:absolute before:left-0 before:top-1 before:h-[calc(100%-0.5rem)] before:w-0.5 before:rounded-full before:bg-[var(--primary)]'
                    : 'text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#a1a1aa]'
                )}
                onClick={onNavigate}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-[#52525b] group-hover:text-[#a1a1aa]')} />
                <span className="font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-[rgba(255,255,255,0.06)] px-2 py-3">
        <div className="flex items-center justify-start px-1">
          <Avatar className="size-8 border border-[rgba(255,255,255,0.08)] bg-[var(--surface-elevated)]">
            <AvatarFallback className="bg-[var(--surface-elevated)] text-[12px] font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <Button
          onClick={async () => {
            onNavigate?.();
            await handleLogout();
          }}
          variant="ghost"
          className="h-8 w-full justify-start px-1 text-[13px] font-medium text-[#71717a] hover:bg-transparent hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
