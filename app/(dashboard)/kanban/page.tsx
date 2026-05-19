'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { KanbanBoard } from '@/components/kanban/board';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, HelpCircle, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function KanbanPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assetsData, clientsData] = await Promise.all([
          assetsApi.getAll(),
          clientsApi.getAll(),
        ]);
        setAssets(assetsData);
        setClients(clientsData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = selectedClient === 'all' || asset.clientId === selectedClient;
    return matchesSearch && matchesClient;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban' }]} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Kanban Board' }]} />

      {/* Help Panel */}
      {showHelp && (
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Kanban Board Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                <li className="flex gap-2">
                  <span className="font-semibold">Drag cards:</span>
                  <span>Drag assets between columns to update status</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">Collapse columns:</span>
                  <span>Click the chevron icon to collapse/expand columns</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">Quick actions:</span>
                  <span>Hover over a card to see quick action buttons</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">Badges:</span>
                  <span>Revision count, comments, and approval status are shown as badges</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">Overdue:</span>
                  <span>Orange alert indicator shows assets pending review for 7+ days</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-900 rounded transition-colors flex-shrink-0"
              aria-label="Close help"
            >
              <X className="w-4 h-4 text-blue-900 dark:text-blue-300" />
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                {selectedClient === 'all'
                  ? 'All Clients'
                  : clients.find((c) => c.id === selectedClient)?.name || 'Select Client'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border">
              <DropdownMenuItem
                className={selectedClient === 'all' ? 'bg-primary/10' : ''}
                onSelect={() => setSelectedClient('all')}
              >
                All Clients
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  className={selectedClient === client.id ? 'bg-primary/10' : ''}
                  onSelect={() => setSelectedClient(client.id)}
                >
                  {client.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setShowHelp(!showHelp)}
            className="border-border text-foreground hover:bg-muted"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>

          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </div>
      </div>

      <KanbanBoard assets={filteredAssets} />
    </div>
  );
}
