"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import ErrorBoundary from "@/components/ui/error-boundary"
import { PageSkeleton } from "@/components/ui/page-skeleton"

const KanbanBoard = dynamic(
  () => import("@/components/kanban/board").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => <PageSkeleton rows={3} />,
  },
)

import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { assetsApi, kanbanApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Asset, KanbanClientOption } from "@/types/index"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const AssetFormDialog = dynamic(
  () =>
    import("@/components/assets/asset-form-dialog").then(
      (mod) => mod.AssetFormDialog,
    ),
  {
    ssr: false,
    loading: () => <PageSkeleton rows={2} />,
  },
)

type BoardData = { assets: Asset[]; clients: KanbanClientOption[] }

export default function KanbanPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    data: boardData,
    isLoading,
    error,
  } = useQuery<BoardData>({
    queryKey: ["board"],
    queryFn: () => kanbanApi.getBoard(),
  })

  const assets = boardData?.assets ?? []
  const clients = boardData?.clients ?? []

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = asset.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesClient =
        selectedClient === "all" || asset.clientId === selectedClient
      return matchesSearch && matchesClient
    })
  }, [assets, searchQuery, selectedClient])

  const statusMutation = useMutation({
    mutationFn: ({
      assetId,
      newStatus,
    }: {
      assetId: string
      newStatus: Asset["status"]
    }) => assetsApi.update(assetId, { status: newStatus }),
    onMutate: async ({ assetId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["board"] })
      const previous = queryClient.getQueryData<BoardData>(["board"])
      queryClient.setQueryData<BoardData>(["board"], (old) => {
        if (!old) return old as unknown as BoardData
        return {
          ...old,
          assets: old.assets.map((item) =>
            item.id === assetId ? { ...item, status: newStatus } : item,
          ),
        }
      })
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["board"], context.previous)
      }
      const message =
        err instanceof Error ? err.message : "Failed to update status"
      toast({
        title: "Status update failed",
        description: message,
        variant: "destructive",
      })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<BoardData>(["board"], (old) => {
        if (!old) return old as unknown as BoardData
        return {
          ...old,
          assets: old.assets.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        }
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] })
    },
  })

  const handleStatusChange = (assetId: string, newStatus: Asset["status"]) => {
    statusMutation.mutate({ assetId, newStatus })
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Kanban" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Kanban" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load kanban data"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="space-y-6 kanban-container"
        style={{
          backgroundColor: "var(--color-bg-app)",
          minHeight: "100vh",
          margin: "-24px",
          padding: "24px 32px",
        }}
      >
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Kanban Board" },
          ]}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="kanban-title">Kanban Board</h1>
            <p className="kanban-subtitle">
              Track and coordinate deliverable status changes
            </p>
          </div>

          <div className="search-container w-full lg:hidden">
            <Search className="search-icon" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="search-container hidden lg:block">
              <Search className="search-icon" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "filter-btn",
                    selectedClient !== "all" && "active",
                  )}
                >
                  {selectedClient === "all"
                    ? "All Clients"
                    : clients.find((c) => c.id === selectedClient)?.name ||
                      "Select Client"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
              >
                <DropdownMenuItem
                  className={cn(
                    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                    selectedClient === "all" &&
                      "bg-[var(--color-bg-active)] text-white",
                  )}
                  onSelect={() => setSelectedClient("all")}
                >
                  All Clients
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--color-border)]" />
                {clients.map((client) => (
                  <DropdownMenuItem
                    key={client.id}
                    className={cn(
                      "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
                      selectedClient === client.id &&
                        "bg-[var(--color-bg-active)] text-white",
                    )}
                    onSelect={() => setSelectedClient(client.id)}
                  >
                    {client.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <AssetFormDialog
              mode="create"
              onSaved={(asset) => {
                queryClient.setQueryData<BoardData>(["board"], (old) => {
                  if (!old) return old as unknown as BoardData
                  return { ...old, assets: [asset, ...old.assets] }
                })
                queryClient.invalidateQueries({ queryKey: ["board"] })
              }}
              trigger={
                <Button variant="accent">
                  <Plus className="w-4 h-4 mr-2" />
                  New Asset
                </Button>
              }
            />
          </div>
        </div>

        <KanbanBoard
          assets={filteredAssets}
          onStatusChange={handleStatusChange}
        />
      </div>
    </ErrorBoundary>
  )
}
