import type * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[#52525b] selection:bg-primary selection:text-primary-foreground border border-[rgba(255,255,255,0.08)] h-9 w-full min-w-0 rounded-[8px] bg-[#161616] px-3 py-1 text-[13px] text-white shadow-none transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "hover:border-[rgba(255,255,255,0.12)] focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-[rgba(99,102,241,0.1)] focus-visible:ring-[3px]",
        "aria-invalid:ring-[rgba(239,68,68,0.1)] aria-invalid:border-[#ef4444]",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
