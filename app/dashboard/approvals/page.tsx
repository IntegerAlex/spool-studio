'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ApprovalsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [assetsData, clientsData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);

        const clientMap = new Map(clientsData.map((c) => [c.id, c]));
        setClients(clientMap);

        const approvalsAssets = assetsData.filter(
          (a) => a.status === 'ready_for_review' || a.status === 'revision_requested'
        );
        setAssets(approvalsAssets);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load approvals';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const readyForReview = assets.filter((a) => a.status === 'ready_for_review');
  const revisionRequested = assets.filter((a) => a.status === 'revision_requested');

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading approvals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-foreground">{readyForReview.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Need Revisions</p>
              <p className="text-2xl font-bold text-foreground">{revisionRequested.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold text-foreground">{assets.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {readyForReview.length > 0 && (
          <Card className="p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Ready for Review</h2>
            <div className="space-y-3">
              {readyForReview.map((asset) => {
                const client = clients.get(asset.clientId);
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{asset.title}</p>
                      <p className="text-sm text-muted-foreground">{client?.name || 'Unknown Client'}</p>
                    </div>
                    <Link href={`/dashboard/assets/${asset.id}`}>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Review
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {revisionRequested.length > 0 && (
          <Card className="p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Awaiting Revisions</h2>
            <div className="space-y-3">
              {revisionRequested.map((asset) => {
                const client = clients.get(asset.clientId);
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 border border-orange-200 dark:border-orange-900/30 rounded-lg bg-orange-50/50 dark:bg-orange-900/10"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{asset.title}</p>
                      <p className="text-sm text-muted-foreground">{client?.name || 'Unknown Client'}</p>
                    </div>
                    <Link href={`/dashboard/assets/${asset.id}`}>
                      <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                        Follow Up
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {assets.length === 0 && (
          <Card className="p-12 border border-border text-center">
            <p className="text-muted-foreground mb-4">No items pending approval</p>
            <p className="text-sm text-muted-foreground">All assets are either approved or archived</p>
          </Card>
        )}
      </div>
    </div>
  );
}
