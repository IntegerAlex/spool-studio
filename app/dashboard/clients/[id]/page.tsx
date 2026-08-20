"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ClientDetail } from "@/components/clients/client-detail"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { assetsApi, clientsApi } from "@/lib/api-client"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string | undefined

  const clientQuery = useQuery({
    queryKey: ["clients", clientId],
    queryFn: () => clientsApi.getById(clientId!),
    enabled: !!clientId,
  })

  const assetsQuery = useQuery({
    queryKey: ["assets", { clientId }],
    queryFn: () => assetsApi.getByClientId(clientId!),
    enabled: !!clientId,
  })

  const isLoading = clientQuery.isLoading || assetsQuery.isLoading
  const error = clientQuery.error || assetsQuery.error

  if (!clientId) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Error" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Client id is required</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Loading..." },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Loading client details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Error" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!clientQuery.data) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Not found" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Client not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/dashboard/clients" },
          { label: clientQuery.data.name },
        ]}
      />
      <ClientDetail client={clientQuery.data} assets={assetsQuery.data ?? []} />
    </div>
  )
}
