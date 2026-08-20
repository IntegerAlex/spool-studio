"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ClientList } from "@/components/clients/client-list"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import ErrorBoundary from "@/components/ui/error-boundary"
import { clientsApi } from "@/lib/api-client"
import type { Client } from "@/types/index"

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="space-y-6 clients-container"
        style={{
          backgroundColor: "var(--color-bg-app)",
          minHeight: "100vh",
          margin: "-24px",
          padding: "32px",
        }}
      >
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients" },
          ]}
        />
        <ClientList
          clients={clients}
          onCreated={(client) => {
            console.info("[clients-page] created client", client)
            queryClient.setQueryData<Client[]>(["clients"], (prev) => prev ? [client, ...prev] : [client])
          }}
        />
      </div>
    </ErrorBoundary>
  )
}
