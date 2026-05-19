import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { requireUser } from '@/lib/supabase/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireUser();

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
