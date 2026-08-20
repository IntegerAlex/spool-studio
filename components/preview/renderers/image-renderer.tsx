"use client"

import Image from "next/image"
import { useState } from "react"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface ImageRendererProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  compact?: boolean
  onError: () => void
}

export function ImageRenderer({
  descriptor,
  urls,
  compact,
  onError,
}: ImageRendererProps) {
  const [loaded, setLoaded] = useState(false)
  const imageUrl = descriptor.thumbnailUrl ?? urls.viewUrl ?? urls.openUrl

  if (!imageUrl) {
    return null
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center bg-[rgba(255,255,255,0.02)]"
      style={{ minHeight: compact ? 220 : 420 }}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-[rgba(255,255,255,0.04)]" />
      )}
      <Image
        src={imageUrl}
        alt={descriptor.title}
        fill
        sizes="(max-width: 768px) 100vw, 70vw"
        className={`object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={onError}
        unoptimized
        priority={false}
      />
    </div>
  )
}
