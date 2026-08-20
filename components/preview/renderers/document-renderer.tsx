"use client"

import { useCallback } from "react"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface DocumentRendererProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  compact?: boolean
  onError: () => void
  iframeRef?: (el: HTMLIFrameElement | null) => void
}

export function DocumentRenderer({
  descriptor,
  urls,
  compact,
  onError,
  iframeRef,
}: DocumentRendererProps) {
  const documentUrl = urls.previewUrl ?? urls.openUrl

  const refCallback = useCallback(
    (el: HTMLIFrameElement | null) => {
      if (iframeRef) {
        iframeRef(el)
      }
    },
    [iframeRef],
  )

  if (!documentUrl) {
    return null
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center bg-[rgba(255,255,255,0.02)]"
      style={{ minHeight: compact ? 220 : 420 }}
    >
      <iframe
        ref={refCallback}
        src={documentUrl}
        className="h-full w-full flex-1 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f0f0f]"
        onError={onError}
        title={`Document preview: ${descriptor.title}`}
      />
    </div>
  )
}
