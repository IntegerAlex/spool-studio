"use client"

import { ArrowRight, Download, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/asset-display"
import { formatFileSize } from "@/lib/asset-metadata"
import type {
  AssetPreviewDescriptor,
  AssetPreviewUrls,
} from "@/lib/asset-preview"

interface PreviewMetadataProps {
  descriptor: AssetPreviewDescriptor
  urls: AssetPreviewUrls
  assetId?: string | null
  clientName?: string | null
  uploadedAt?: Date | null
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-[#71717a]">{label}</span>
      <span className="truncate text-[13px] font-medium text-white">
        {value}
      </span>
    </div>
  )
}

export function PreviewMetadata({
  descriptor,
  urls,
  assetId,
  clientName,
  uploadedAt,
}: PreviewMetadataProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
          Details
        </h3>
        <div className="space-y-2.5">
          <DetailRow
            label="Type"
            value={
              descriptor.mimeType?.split("/")?.pop()?.toUpperCase() ??
              descriptor.fileExtension?.toUpperCase()
            }
          />
          <DetailRow
            label="Size"
            value={
              descriptor.fileSize != null
                ? formatFileSize(descriptor.fileSize)
                : null
            }
          />
          <DetailRow
            label="Duration"
            value={
              descriptor.durationSeconds != null
                ? `${Math.round(descriptor.durationSeconds)}s`
                : null
            }
          />
          <DetailRow
            label="Uploaded"
            value={uploadedAt ? formatRelativeTime(uploadedAt) : null}
          />
          <DetailRow label="Client" value={clientName} />
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          {urls.openUrl && (
            <Button
              variant="secondary"
              size="sm"
              className="justify-start border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
              asChild
            >
              <a href={urls.openUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open File
              </a>
            </Button>
          )}
          {urls.downloadUrl && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start border border-[rgba(255,255,255,0.1)] bg-transparent text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              asChild
            >
              <a href={urls.downloadUrl} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          )}
          {assetId && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              asChild
            >
              <Link href={`/dashboard/assets/${assetId}`}>
                <FileText className="mr-2 h-4 w-4" />
                View Details
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
