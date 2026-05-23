'use client'

import { useToast } from '@/hooks/use-toast'
import { AlertCircle, Info } from 'lucide-react'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isDestructive = props.variant === 'destructive'
        return (
          <Toast key={id} {...props}>
            <div className="flex min-w-0 items-start gap-3">
              <div className={isDestructive ? 'mt-0.5 text-[#f87171]' : 'mt-0.5 text-[#818cf8]'}>
                {isDestructive ? <AlertCircle className="size-4" /> : <Info className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="grid gap-0.5">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && <ToastDescription>{description}</ToastDescription>}
                </div>
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
