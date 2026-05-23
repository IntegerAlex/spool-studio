import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { getUser } from '@/lib/supabase/auth';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Content Ops Pro</h1>
          <p className="text-muted-foreground">Professional content management platform</p>
        </div>

        <Card className="p-8 space-y-6 border border-border">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
