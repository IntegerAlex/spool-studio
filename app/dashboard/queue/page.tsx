'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { queueApi, assetsApi, clientsApi } from '@/lib/api-client';
import { UploadQueue, Asset, Client } from '@/types/index';
import { Download, Copy, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function QueuePage() {
  const [queue, setQueue] = useState<UploadQueue[]>([]);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [queueData, assetsData, clientsData] = await Promise.all([
          queueApi.getAll(),
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);

        setQueue(queueData);
        setAssets(new Map(assetsData.map((a) => [a.id, a])));
        setClients(new Map(clientsData.map((c) => [c.id, c])));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
  };

  const scheduledQueue = queue.filter((q) => q.status === 'scheduled').sort((a, b) =>
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Queue' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upload Queue' }]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Scheduled Uploads</p>
          <p className="text-3xl font-bold text-foreground">{scheduledQueue.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Next 7 days</p>
        </Card>
        <Card className="p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Pending Upload</p>
          <p className="text-3xl font-bold text-foreground">
            {queue.filter((q) => q.status === 'pending').length}
          </p>
        </Card>
        <Card className="p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Already Uploaded</p>
          <p className="text-3xl font-bold text-foreground">
            {queue.filter((q) => q.status === 'uploaded').length}
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        {scheduledQueue.map((item) => {
          const asset = assets.get(item.assetId);
          const client = asset ? clients.get(asset.clientId) : null;

          return (
            <Card key={item.id} className="p-6 border border-border space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {asset?.title || 'Unknown Asset'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {client?.name || 'Unknown Client'} •{' '}
                    <span className="inline-flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.scheduledDate).toLocaleDateString()}</span>
                    </span>
                  </p>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
                      {item.platform}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border border-border">
                    <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                      <Download className="w-4 h-4 mr-2" />
                      Download Asset
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-foreground cursor-pointer hover:bg-muted">
                      Edit Schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive cursor-pointer hover:bg-destructive/10">
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {item.caption && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Caption</p>
                  <div className="flex items-start space-x-3">
                    <p className="flex-1 text-sm text-foreground bg-muted/50 p-3 rounded-lg">
                      {item.caption}
                    </p>
                    <button
                      onClick={() => handleCopyCaption(item.caption || '')}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      title="Copy caption"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {item.hashtags && item.hashtags.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {item.hashtags.map((tag, index) => (
                      <button
                        key={index}
                        onClick={() => handleCopyCaption(tag)}
                        className="px-3 py-1 text-sm text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                        title="Copy hashtag"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {scheduledQueue.length === 0 && (
        <Card className="p-12 border border-border text-center">
          <p className="text-muted-foreground mb-4">No scheduled uploads</p>
          <p className="text-sm text-muted-foreground">Upload scheduling will appear here when assets are approved</p>
        </Card>
      )}
    </div>
  );
}
