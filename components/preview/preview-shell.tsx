"use client"

import { X } from "lucide-react"
import { useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { getAssetPreviewType } from "@/lib/asset-display"
import {
  getAssetPreviewUrls,
  toAssetPreviewDescriptor,
} from "@/lib/asset-preview"
import type { Asset } from "@/types/index"
import { PreviewMedia } from "./preview-media"
import { PreviewMetadata } from "./preview-metadata"

interface PreviewShellProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreviewShell({ asset, open, onOpenChange }: PreviewShellProps) {
  const descriptor = asset ? toAssetPreviewDescriptor(asset) : null
  const urls = descriptor ? getAssetPreviewUrls(descriptor) : null
  const previewType = descriptor ? getAssetPreviewType(descriptor) : null

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[1180px] border-none bg-[#161616] p-0 shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: "92vh" }}
        onPointerDownOutside={() => onOpenChange(false)}
      >
        <DialogTitle className="sr-only">
          {asset?.title ?? "Asset Preview"}
        </DialogTitle>

        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-[#71717a] transition-colors hover:bg-[rgba(255,255,255,0.12)] hover:text-white"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>

        {descriptor && urls && (
          <>
            <div className="border-b border-[rgba(255,255,255,0.06)] px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-medium text-white">
                    {descriptor.title}
                  </h2>
                </div>
                {previewType && (
                  <span className="shrink-0 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#a1a1aa]">
                    {previewType}
                  </span>
                )}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-0 min-w-0 flex-col overflow-auto rounded-xl">
                <PreviewMedia descriptor={descriptor} />
              </div>

              <div className="hidden overflow-auto rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 lg:block">
                <PreviewMetadata
                  descriptor={descriptor}
                  urls={urls}
                  assetId={asset?.id}
                  clientName={asset?.clientId}
                  uploadedAt={asset?.uploadedAt}
                />
              </div>
            </div>

            <div className="mx-4 mb-4 mt-2 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 sm:mx-6 sm:mb-6 sm:mt-3 lg:hidden">
              <PreviewMetadata
                descriptor={descriptor}
                urls={urls}
                assetId={asset?.id}
                clientName={asset?.clientId}
                uploadedAt={asset?.uploadedAt}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
