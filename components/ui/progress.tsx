'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-[width] duration-500 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

function ProgressLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-label"
      className={cn('text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-value"
      className={cn('text-sm font-semibold tabular-nums', className)}
      {...props}
    />
  )
}

export { Progress, ProgressLabel, ProgressValue }
