"use client"

import { useHotkey } from "@tanstack/react-hotkeys"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { searchApi } from "@/lib/api-client"

const SEARCH_DEBOUNCE_MS = 250

export function SearchPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  // Global ⌘K / Ctrl+K toggle (Mod maps to Cmd on macOS, Ctrl elsewhere).
  useHotkey(
    "Mod+K",
    () => {
      setOpen((prev) => !prev)
    },
    { preventDefault: true },
  )

  const trimmed = debouncedQuery.trim()
  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  })

  const clients = data?.clients ?? []
  const assets = data?.assets ?? []
  const totalResults = clients.length + assets.length

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-md border border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-[#71717a] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
        aria-label="Search (Command+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-[12.5px] md:inline">Search…</span>
        <kbd className="hidden rounded border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 font-mono text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search"
        description="Search clients and assets"
      >
        <CommandInput
          placeholder="Search clients and assets…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isFetching && totalResults === 0 && (
            <div className="px-4 py-6 text-center text-[12.5px] text-[var(--color-text-muted)]">
              Searching…
            </div>
          )}
          {!isFetching && trimmed.length > 0 && totalResults === 0 && (
            <CommandEmpty>No matches found.</CommandEmpty>
          )}
          {trimmed.length === 0 && (
            <div className="px-4 py-6 text-center text-[12.5px] text-[var(--color-text-muted)]">
              Type to search clients and assets.
            </div>
          )}
          {clients.length > 0 && (
            <CommandGroup heading="Clients">
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`client-${c.name}-${c.id}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/dashboard/clients/${c.id}`)
                  }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-overlay)] text-[11px] text-white">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-white">
                      {c.name}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                      {c.instagramHandle ? `@${c.instagramHandle}` : c.slug}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {assets.length > 0 && (
            <CommandGroup heading="Assets">
              {assets.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`asset-${a.title}-${a.id}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/dashboard/assets/${a.id}`)
                  }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-overlay)] text-[11px] capitalize text-white">
                    {a.type.slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-white">
                      {a.title}
                    </span>
                    <span className="block truncate text-[11px] capitalize text-[var(--color-text-muted)]">
                      {a.type}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
