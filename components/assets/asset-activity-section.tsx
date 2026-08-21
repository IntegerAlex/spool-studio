"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { activityApi } from "@/lib/api-client"
import type { User } from "@/types/index"

interface AssetActivitySectionProps {
  assetId: string
}

const ACTIVITY_LIMIT = 12

export function AssetActivitySection({ assetId }: AssetActivitySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const activityQuery = useQuery({
    queryKey: ["activity", assetId],
    queryFn: () => activityApi.getByAssetId(assetId, { limit: ACTIVITY_LIMIT }),
    enabled: !isCollapsed,
  })

  const activity = useMemo(
    () => activityQuery.data?.activity ?? [],
    [activityQuery.data],
  )

  const userMap = useMemo(() => {
    const map = new Map<string, User>()
    activityQuery.data?.users.forEach((user) => map.set(user.id, user))
    return map
  }, [activityQuery.data])

  const toggle = () => {
    setIsCollapsed((prev) => !prev)
  }

  return (
    <Card className="border border-[rgba(255,255,255,0.08)] bg-[#161616] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-white">Activity</h3>
        <button
          aria-expanded={!isCollapsed}
          onClick={toggle}
          className="text-[#71717a] hover:text-white transition-colors duration-150"
        >
          <svg
            className={`h-4 w-4 transform transition-transform duration-150 ${isCollapsed ? "rotate-180" : "rotate-0"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 9l6 6 6-6"
            />
          </svg>
        </button>
      </div>

      <div
        className="mt-4"
        style={{
          maxHeight: isCollapsed ? 0 : 800,
          overflow: "hidden",
          transition: "max-height 200ms ease",
        }}
      >
        {activityQuery.isLoading ? (
          <div className="py-4 text-[12px] text-[#71717a]">
            Loading activity...
          </div>
        ) : activity.length === 0 ? (
          <div className="py-6 text-[12px] text-[#71717a]">
            No recent activity.
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((entry) => {
              const actor = entry.userId
                ? (userMap.get(entry.userId)?.name ?? entry.userId)
                : "System"
              return (
                <div
                  key={entry.id}
                  className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#0f0f0f] p-3"
                >
                  <p className="text-[12px] text-white">
                    {entry.action.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-[11px] text-[#71717a]">
                    {actor} · {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
