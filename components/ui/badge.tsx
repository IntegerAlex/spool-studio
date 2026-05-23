import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[12px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-[rgba(99,102,241,0.1)] focus-visible:ring-[3px] aria-invalid:ring-[rgba(239,68,68,0.1)] aria-invalid:border-[#ef4444] transition-[color,box-shadow,border-color] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[rgba(99,102,241,0.16)] text-[#c7d2fe] [a&]:hover:bg-[rgba(99,102,241,0.22)]',
        secondary:
          'border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#a1a1aa] [a&]:hover:bg-[rgba(255,255,255,0.06)] [a&]:hover:text-white',
        destructive:
          'border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.12)] text-[#fca5a5] [a&]:hover:bg-[rgba(239,68,68,0.16)] focus-visible:ring-[rgba(239,68,68,0.1)]',
        outline:
          'border-[rgba(255,255,255,0.1)] text-[#a1a1aa] [a&]:hover:bg-[rgba(255,255,255,0.06)] [a&]:hover:text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
