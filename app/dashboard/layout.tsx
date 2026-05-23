import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { requireUser } from '@/lib/supabase/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  await requireUser();

  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground">
      <Sidebar />
      <div className="ml-[220px] flex min-h-screen flex-col bg-[var(--surface-main)]">
        <Header title="Dashboard" />
        <main className="flex-1 px-6 pt-16 pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}
