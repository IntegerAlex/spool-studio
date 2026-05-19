'use client';

import { Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';

interface ClientListProps {
  clients: Client[];
}

export function ClientList({ clients }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.instagramHandle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-border"
          />
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
            <Card className="p-6 border border-border hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.instagramHandle}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Team Members</p>
                    <p className="text-lg font-bold text-primary">
                      {client.assignedTeamMembers.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Deliverables</p>
                    <p className="text-lg font-bold text-primary">
                      {client.completedDeliverables}/{client.monthlyDeliverables}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Progress</p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${(client.completedDeliverables / client.monthlyDeliverables) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div
                  className="w-6 h-6 rounded-lg"
                  style={{ backgroundColor: client.brandColor }}
                ></div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No clients found</p>
        </div>
      )}
    </div>
  );
}
