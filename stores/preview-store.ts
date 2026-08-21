"use client"

import { create } from "zustand"
import type { AssetPreviewDescriptor } from "@/lib/asset-preview"

interface PreviewState {
  item: AssetPreviewDescriptor | null
  open: boolean
  openPreview: (item: AssetPreviewDescriptor) => void
  closePreview: () => void
}

export const usePreviewStore = create<PreviewState>((set) => ({
  item: null,
  open: false,
  openPreview: (item) => set({ item, open: true }),
  closePreview: () => set({ open: false }),
}))
