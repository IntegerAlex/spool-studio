'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Image,
  CheckSquare,
  Calendar,
  Settings,
  Upload,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

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
    icon: Image,
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold">C</span>
          </div>
          <h1 className="text-lg font-bold text-sidebar-foreground">Content Ops</h1>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
