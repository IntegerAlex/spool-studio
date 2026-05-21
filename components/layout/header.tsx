'use client';

import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
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
  const displayRole = user?.user_metadata?.role as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="bg-background border-b border-border h-16 flex items-center justify-between px-8 fixed top-0 left-64 right-0 z-40">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-muted border-border"
          />
        </div>

        <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
          <Bell className="w-5 h-5" />
        </Button>

        {user && (
          <div className="flex items-center space-x-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              {displayRole && (
                <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
              )}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
}
