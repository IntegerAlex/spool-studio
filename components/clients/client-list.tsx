'use client';

import { Client } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Search, Plus, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ClientListProps {
  clients: Client[];
  onCreated?: (client: Client) => void;
}

export function ClientList({ clients, onCreated }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.instagramHandle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[18px] font-medium text-white">Clients</h1>
        <ClientFormDialog
          onSaved={onCreated}
          trigger={
            <Button className="h-[34px] rounded-md bg-[var(--primary)] px-3 text-[13px] font-medium text-white shadow-none hover:bg-[#4f46e5]">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          }
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 border-[rgba(255,255,255,0.08)] bg-[#161616] pl-10 text-[13px] text-white placeholder:text-[#52525b] focus-visible:border-[rgba(99,102,241,0.4)] focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map((client) => (
          <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
            <Card className="group h-full rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#161616] p-0 shadow-none transition-colors duration-150 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#1a1a1a]">
              <div className="space-y-5 px-5 py-[18px]">
                <div>
                  <h3 className="text-[16px] font-medium text-white">{client.name}</h3>
                  <p className="mt-1 text-[12px] text-[#71717a]">
                    {client.instagramHandle || client.slug || 'No handle set'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Team Members</p>
                    <p className="text-[20px] font-medium text-white">{client.assignedTeamMembers.length}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Deliverables</p>
                    <p className="text-[20px] font-medium text-[#6366f1]">
                      {client.completedDeliverables}/{client.monthlyDeliverables}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-[#71717a]">Progress</p>
                  <div className="h-[3px] rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div
                      className="h-full rounded-full bg-[#6366f1] transition-all duration-150"
                      style={{
                        width: client.monthlyDeliverables > 0
                          ? `${(client.completedDeliverables / client.monthlyDeliverables) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className={cn('text-[12px] font-medium text-[#6366f1]')}>
                    View <ArrowRight className="ml-1 inline-block h-3 w-3" />
                  </span>
                </div>
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
