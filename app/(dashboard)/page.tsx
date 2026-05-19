'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { assetsApi, clientsApi, queueApi } from '@/lib/api-client';
import { Asset, Client, UploadQueue } from '@/types/index';
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Users,
  Upload,
} from 'lucide-react';

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [queue, setQueue] = useState<UploadQueue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetsData, clientsData, queueData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
          queueApi.getAll(),
        ]);
        setAssets(assetsData);
        setClients(clientsData);
        setQueue(queueData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const pendingApprovals = assets.filter((a) => a.status === 'ready_for_review').length;
  const upcomingUploads = queue.filter((q) => q.status === 'scheduled').length;
  const totalClients = clients.length;
  const completedThisMonth = assets.filter((a) => a.status === 'uploaded').length;

  const overviewCards = [
    {
      title: 'Pending Approvals',
      value: pendingApprovals,
      icon: <CheckCircle className="w-6 h-6" />,
      change: '+2 from yesterday',
      trend: 'up' as const,
    },
    {
      title: 'Assets Uploaded Today',
      value: completedThisMonth,
      icon: <Upload className="w-6 h-6" />,
      change: 'On track',
      trend: 'neutral' as const,
    },
    {
      title: 'Upcoming Uploads',
      value: upcomingUploads,
      icon: <Calendar className="w-6 h-6" />,
      change: 'Next 7 days',
      trend: 'neutral' as const,
    },
    {
      title: 'Active Clients',
      value: totalClients,
      icon: <Users className="w-6 h-6" />,
      change: '100% active',
      trend: 'up' as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />

      <OverviewCards cards={overviewCards} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Assets</h3>
            <div className="space-y-3">
              {assets.slice(0, 5).map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{asset.title}</p>
                    <p className="text-sm text-muted-foreground">{asset.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      asset.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : asset.status === 'revision_requested'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {asset.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Deliverables</h3>
            <div className="space-y-4">
              {clients.slice(0, 4).map((client) => (
                <div key={client.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.completedDeliverables}/{client.monthlyDeliverables}
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${(client.completedDeliverables / client.monthlyDeliverables) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Asset Status Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Draft', count: assets.filter((a) => a.status === 'draft').length },
                { label: 'In Review', count: assets.filter((a) => a.status === 'ready_for_review').length },
                { label: 'Approved', count: assets.filter((a) => a.status === 'approved').length },
                { label: 'Scheduled', count: assets.filter((a) => a.status === 'scheduled').length },
              ].map((status) => (
                <div
                  key={status.label}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm text-foreground">{status.label}</span>
                  <span className="text-sm font-semibold text-primary">{status.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                New Asset
              </button>
              <button className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium">
                View Calendar
              </button>
              <button className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium">
                Team Settings
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
