"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ClientDetail } from "@/components/clients/client-detail"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { assetsApi, clientsApi } from "@/lib/api-client"
import type { Asset, Client } from "@/types/index"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string | undefined

  const [client, setClient] = useState<Client | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        console.info("[client-detail] params", params)
        if (!clientId) {
          setError("Client id is required")
          setIsLoading(false)
          return
        }
        setError(null)
        const [clientData, assetsData] = await Promise.all([
          clientsApi.getById(clientId),
          assetsApi.getByClientId(clientId),
        ])
        setClient(clientData)
        setAssets(assetsData)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load client"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [clientId, params])

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
          <p className="text-[#71717a]">{error}</p>
        </div>
      </div>
    )
  }

  if (!client) {
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
          { label: client.name },
        ]}
      />
      <ClientDetail client={client} assets={assets} />
    </div>
  )
}
