'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ClientList } from '@/components/clients/client-list';
import { clientsApi } from '@/lib/api-client';
import { Client } from '@/types/index';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await clientsApi.getAll();
        setClients(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]} />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 clients-container" style={{ backgroundColor: 'var(--color-bg-app)', minHeight: '100vh', margin: '-24px', padding: '32px' }}>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]} />
      <ClientList
        clients={clients}
        onCreated={(client) => {
          console.info('[clients-page] created client', client);
          setClients((prev) => [client, ...prev]);
        }}
      />
    </div>
  );
}
