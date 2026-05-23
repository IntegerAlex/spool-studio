import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-shimmer rounded-[6px] bg-[rgba(255,255,255,0.06)]', className)}
      {...props}
    />
  )
}

export { Skeleton }
