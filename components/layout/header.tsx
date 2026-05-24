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
    .map((part) => part[0]?.toUpperCase())
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
    <header className={cn('fixed left-[220px] top-0 z-40 hidden h-11 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[var(--sidebar)] px-6 lg:flex', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-medium text-white">{routeTitle}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
          <Input
            placeholder="Search..."
            className="h-8 border-[rgba(255,255,255,0.07)] bg-transparent pl-9 text-[13px] text-white placeholder:text-[#71717a] focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-[rgba(99,102,241,0.2)]"
          />
        </div>

        <Button variant="ghost" size="icon" className="size-8 text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white">
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Avatar className="size-8 border border-[rgba(255,255,255,0.08)] bg-[var(--surface-elevated)]">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-[var(--surface-elevated)] text-[12px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
