'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-12 w-12 text-[#f59e0b] mb-4" />
      <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-[#71717a] mb-6 max-w-md">{error.message || 'An unexpected error occurred'}</p>
      <Button onClick={reset} variant="outline" className="border-[rgba(255,255,255,0.1)]">
        Try again
      </Button>
    </div>
  );
}
