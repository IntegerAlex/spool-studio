"use client"

import { useToastStore } from "@/stores/toast-store"
import type { ToasterToast } from "@/stores/toast-store"

export type { ToasterToast }

type Toast = Omit<ToasterToast, "id">

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    useToastStore.getState().updateToast({ ...props, id })
  const dismiss = () => useToastStore.getState().dismissToast(id)

  useToastStore.getState().addToast({
    ...props,
    id,
    open: true,
    duration: 4000,
    onOpenChange: (open) => {
      if (!open) dismiss()
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}

function useToast() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  return {
    toasts,
    toast,
    dismiss: (toastId?: string) => dismissToast(toastId),
  }
}

export { toast, useToast }
