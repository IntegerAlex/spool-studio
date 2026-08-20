"use client"

import {
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  FileUp,
  ImageIcon,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AssetPreviewType } from "@/lib/asset-display"
import type { AssetPreviewUrls } from "@/lib/asset-preview"

interface PreviewFallbackProps {
  previewType: AssetPreviewType
  urls: AssetPreviewUrls
  title: string
}

const iconMap: Record<AssetPreviewType, typeof FileText> = {
  image: ImageIcon,
  video: Video,
  audio: FileAudio,
  document: FileUp,
  file: FileText,
}

export function PreviewFallback({
  previewType,
  urls,
  title,
}: PreviewFallbackProps) {
  const Icon = iconMap[previewType]

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ minHeight: 420 }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
        <Icon className="h-10 w-10 text-[#71717a]" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">Preview unavailable</p>
        <p className="mt-1 max-w-md text-xs text-[#71717a]">
          Unable to load a preview for this {previewType} file.
        </p>
      </div>
      <div className="flex gap-2">
        {urls.openUrl && (
          <Button
            variant="secondary"
            size="sm"
            className="border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
            asChild
          >
            <a href={urls.openUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open File
            </a>
          </Button>
        )}
        {urls.downloadUrl && (
          <Button
            variant="outline"
            size="sm"
            className="border border-[rgba(255,255,255,0.1)] bg-transparent text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            asChild
          >
            <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-3.5 w-3.5" />
              Download
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
