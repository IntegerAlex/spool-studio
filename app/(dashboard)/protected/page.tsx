import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/supabase/auth';

export default async function ProtectedDashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Protected Dashboard</h1>
      <Card className="p-6 border border-border">
        <p className="text-sm text-muted-foreground">Authenticated as</p>
        <p className="text-lg font-semibold text-foreground">{user.email}</p>
      </Card>
    </div>
  );
}
