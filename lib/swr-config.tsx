"use client"

import { SWRConfig } from "swr"

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error("API request failed")
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 2,
        shouldRetryOnError: (error: any) =>
          error?.status !== 401 && error?.status !== 403,
      }}
    >
      {children}
    </SWRConfig>
  )
}
