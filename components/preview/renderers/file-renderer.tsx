"use client"

import { Download, ExternalLink, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface FileRendererProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  compact?: boolean
}

export function FileRenderer({ urls, compact }: FileRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ minHeight: compact ? 220 : 420 }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
        <FileText className="h-10 w-10 text-[#71717a]" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">Preview unavailable</p>
        <p className="mt-1 max-w-md text-xs text-[#71717a]">
          This file type cannot be previewed directly.
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
