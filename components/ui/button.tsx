import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { Spinner } from "@/components/ui/spinner"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[color,box-shadow,transform,border-color,background-color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[rgba(16,185,129,0.5)] focus-visible:ring-[rgba(16,185,129,0.1)] focus-visible:ring-[3px] aria-invalid:ring-[rgba(239,68,68,0.1)] aria-invalid:border-[#ef4444]",
  {
    variants: {
      variant: {
        default: "bg-[#3ecf8e] text-black shadow-none hover:opacity-90",
        destructive:
          "border border-[rgba(239,68,68,0.3)] bg-transparent text-[#f87171] shadow-none hover:bg-[rgba(239,68,68,0.08)] hover:text-[#f87171] focus-visible:ring-[rgba(239,68,68,0.12)]",
        outline:
          "border border-[rgba(255,255,255,0.1)] bg-transparent text-[#a1a1aa] shadow-none hover:bg-[rgba(255,255,255,0.06)] hover:text-white",
        secondary:
          "border border-[rgba(255,255,255,0.1)] bg-transparent text-[#a1a1aa] shadow-none hover:bg-[rgba(255,255,255,0.06)] hover:text-white",
        ghost:
          "bg-transparent text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.06)] hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-[#3ecf8e] text-black shadow-none hover:opacity-90",
      },
      size: {
        default: "h-[44px] sm:h-[34px] px-3 py-2 has-[>svg]:px-3",
        sm: "h-[44px] sm:h-[34px] rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-[44px] sm:h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-[44px] sm:size-8",
        "icon-sm": "size-[44px] sm:size-8",
        "icon-lg": "size-[44px] sm:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
// SAFETY: this cast is safe because the value already conforms to the asserted type.
  const loadingProps = props as React.ComponentProps<"button"> & {
    "data-loading"?: string | boolean
  }
  const isLoading =
    Boolean(loadingProps["data-loading"]) || Boolean(loadingProps["aria-busy"])
  const content = (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-2",
        isLoading && "relative text-transparent",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center gap-2",
          isLoading && "invisible",
        )}
      >
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="size-3.5" />
        </span>
      )}
    </span>
  )

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
