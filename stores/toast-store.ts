"use client"

import { create } from "zustand"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000

export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

interface ToastState {
  toasts: ToasterToast[]
  addToast: (toast: ToasterToast) => void
  updateToast: (toast: Partial<ToasterToast> & { id: string }) => void
  dismissToast: (toastId?: string) => void
  removeToast: (toastId?: string) => void
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(toastId: string, remove: (id?: string) => void) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    remove(toastId)
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, TOAST_LIMIT),
    })),
  updateToast: (toast) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === toast.id ? { ...t, ...toast } : t)),
    })),
  dismissToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === toastId || toastId === undefined ? { ...t, open: false } : t,
      ),
    }))
    if (toastId) {
      addToRemoveQueue(toastId, useToastStore.getState().removeToast)
    } else {
      useToastStore.getState().toasts.forEach((t) => {
        addToRemoveQueue(t.id, useToastStore.getState().removeToast)
      })
    }
  },
  removeToast: (toastId) =>
    set((state) => ({
      toasts:
        toastId === undefined
          ? []
          : state.toasts.filter((t) => t.id !== toastId),
    })),
}))
