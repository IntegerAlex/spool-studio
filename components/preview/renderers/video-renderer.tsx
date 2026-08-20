"use client"

import { useCallback } from "react"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface VideoRendererProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  compact?: boolean
  onError: () => void
  videoRef?: (el: HTMLVideoElement | null) => void
}

export function VideoRenderer({
  descriptor,
  urls,
  compact,
  onError,
  videoRef,
}: VideoRendererProps) {
  const videoUrl = urls.previewUrl ?? urls.directMediaUrl ?? urls.openUrl

  const refCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      if (videoRef) {
        videoRef(el)
      }
    },
    [videoRef],
  )

  if (!videoUrl) {
    return null
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center bg-black"
      style={{ minHeight: compact ? 220 : 420 }}
    >
      <video
        ref={refCallback}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full rounded-lg bg-black"
        onError={onError}
      >
        <source src={videoUrl} type={descriptor.mimeType ?? "video/mp4"} />
      </video>
    </div>
  )
}
