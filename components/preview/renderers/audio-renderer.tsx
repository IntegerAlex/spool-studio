"use client"

import { FileAudio } from "lucide-react"
import { useCallback } from "react"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface AudioRendererProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  compact?: boolean
  onError: () => void
  audioRef?: (el: HTMLAudioElement | null) => void
}

export function AudioRenderer({
  descriptor,
  urls,
  compact,
  onError,
  audioRef,
}: AudioRendererProps) {
  const audioUrl = urls.directMediaUrl ?? urls.openUrl

  const refCallback = useCallback(
    (el: HTMLAudioElement | null) => {
      if (audioRef) {
        audioRef(el)
      }
    },
    [audioRef],
  )

  if (!audioUrl) {
    return null
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6"
      style={{ minHeight: compact ? 220 : 420 }}
    >
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
          <FileAudio className="h-8 w-8 text-[#818cf8]" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Audio preview</p>
          <p className="text-xs text-[#71717a]">
            Use the built-in player below to listen.
          </p>
        </div>
        <audio
          ref={refCallback}
          controls
          preload="metadata"
          className="w-full"
          src={audioUrl}
          onError={onError}
        />
      </div>
    </div>
  )
}
