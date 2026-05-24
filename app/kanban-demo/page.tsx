'use client';

import { useEffect, useState } from 'react';
import { KanbanBoard } from '@/components/kanban/board';
import { assetsApi, clientsApi } from '@/lib/api-client';
import { Asset, Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, HelpCircle, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getKanbanWorkflowColumnId } from '@/lib/kanban-workflow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function KanbanDemoPage() {
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
      <div className="min-h-screen bg-background">
        <div className="p-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading kanban board...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Enhanced Kanban Board</h1>
            <p className="text-muted-foreground mt-2">Professional creative operations workflow management</p>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Kanban Board Features</h3>
                <ul className="space-y-3 text-sm text-blue-800 dark:text-blue-400">
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Drag & Drop:</span>
                    <span>Move asset cards across Draft, Review, Approved, and Published without exposing system-only states</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Column Controls:</span>
                    <span>Use the chevron icon to collapse any of the four workflow columns for a tighter view</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Status Counters:</span>
                    <span>Each column shows the count of assets grouped into that business workflow stage</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Quick Actions:</span>
                    <span>Hover over a card to see quick action buttons for View, Approve, and Copy link</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Overdue Indicators:</span>
                    <span>Orange alert shows assets pending review for 7+ days - stay on top of deadlines</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Smart Badges:</span>
                    <span>Revision count, comment count, and hidden transport-state badges provide quick context on cards</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Compact Cards:</span>
                    <span>Dense but readable card design with asset type icons and essential information</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Mobile Responsive:</span>
                    <span>Optimized for mobile and tablet with touch-friendly drag interactions</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold whitespace-nowrap">Keyboard Navigation:</span>
                    <span>Arrow keys to move between columns, Enter to view details, Ctrl+Space to approve</span>
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
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

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <Card className="p-3 bg-muted border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Assets</p>
            <p className="text-2xl font-bold text-foreground">{filteredAssets.length}</p>
          </Card>
          <Card className="p-3 bg-muted border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Draft</p>
            <p className="text-2xl font-bold text-slate-400">{filteredAssets.filter((asset) => getKanbanWorkflowColumnId(asset.status) === 'draft').length}</p>
          </Card>
          <Card className="p-3 bg-muted border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Review</p>
            <p className="text-2xl font-bold text-amber-500">{filteredAssets.filter((asset) => getKanbanWorkflowColumnId(asset.status) === 'review').length}</p>
          </Card>
          <Card className="p-3 bg-muted border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Approved</p>
            <p className="text-2xl font-bold text-emerald-500">{filteredAssets.filter((asset) => getKanbanWorkflowColumnId(asset.status) === 'approved').length}</p>
          </Card>
          <Card className="p-3 bg-muted border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Published</p>
            <p className="text-2xl font-bold text-sky-500">{filteredAssets.filter((asset) => getKanbanWorkflowColumnId(asset.status) === 'published').length}</p>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <KanbanBoard assets={filteredAssets} />
        </div>
      </div>
    </div>
  );
}
