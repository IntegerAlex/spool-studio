"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: (count, error) => {
              const status =
                error instanceof Error && "status" in error
                  ? error.status
                  : undefined
              if (status === 401 || status === 403) return false
              return count < 2
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
