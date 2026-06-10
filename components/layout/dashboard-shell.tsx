'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  title: string;
  children: ReactNode;
}

function getRouteTitle(pathname: string, fallback: string): string {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard';
  if (pathname.startsWith('/dashboard/assets/')) return 'Asset Details';
  if (pathname.startsWith('/dashboard/assets')) return 'Assets';
  if (pathname.startsWith('/dashboard/clients')) return 'Clients';
  if (pathname.startsWith('/dashboard/approvals')) return 'Approvals';
  if (pathname.startsWith('/dashboard/kanban')) return 'Kanban';
  if (pathname.startsWith('/dashboard/queue')) return 'Upload Queue';
  if (pathname.startsWith('/dashboard/calendar')) return 'Calendar';
  if (pathname.startsWith('/dashboard/settings')) return 'Settings';
  return fallback;
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = useMemo(() => {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'CO';
  }, [displayName]);

  const routeTitle = getRouteTitle(pathname, title);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-foreground">
      <Sidebar />

      <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[var(--surface-main)] lg:ml-[280px] lg:w-[calc(100%-280px)]">
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[var(--sidebar)] px-4 lg:hidden pt-[env(safe-area-inset-top)] h-[calc(3.5rem+env(safe-area-inset-top))]">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="relative flex items-center h-full w-full ml-1">
              <Image
                src="/asset_flow.png"
                alt="Asset Flow"
                width={180}
                height={54}
                priority
                className="h-[36px] w-auto shrink-0 object-contain"
              />
            </div>
            <span className="sr-only">Asset Flow</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-9 text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white">
              <Bell className="h-[18px] w-[18px]" />
            </Button>

            <Avatar className="size-8 border border-[rgba(255,255,255,0.08)] bg-[var(--surface-elevated)]">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-[var(--surface-elevated)] text-[12px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 text-[#71717a] hover:bg-[rgba(255,255,255,0.05)] hover:text-white">
                  <Menu className="h-[18px] w-[18px]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-[rgba(255,255,255,0.08)] bg-[var(--sidebar)] p-0 text-white">
                <SheetHeader className="border-b border-[rgba(255,255,255,0.06)] px-4 py-4">
                  <SheetTitle className="text-left text-[15px] text-white">Dashboard navigation</SheetTitle>
                  <SheetDescription className="text-left text-[#a1a1aa]">Jump between sections and manage your workspace.</SheetDescription>
                </SheetHeader>
                <div className="h-[calc(100%-5rem)] overflow-y-auto">
                  <Sidebar variant="drawer" onNavigate={() => setMobileNavOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Header title={routeTitle} className="hidden lg:flex" />

        <main className={cn('flex-1 w-full max-w-full min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pt-16')}> 
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}