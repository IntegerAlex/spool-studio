'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
      // Auto-login for demo purposes
      const demoUser = {
        id: 'user_1',
        email: 'sarah@agency.com',
        name: 'Sarah Chen',
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        createdAt: '2024-01-15T00:00:00.000Z',
      };
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('token', 'mock-jwt-token-user_1');
    }
    
    setIsAuthed(true);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="bg-background min-h-screen"></div>;
  }

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <div className="ml-64 flex flex-col">
        <Header title="Dashboard" />
        <main className="mt-16 p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
