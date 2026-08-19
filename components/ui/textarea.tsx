import type * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border border-[rgba(255,255,255,0.08)] placeholder:text-[#52525b] focus-visible:border-[rgba(99,102,241,0.5)] focus-visible:ring-[rgba(99,102,241,0.1)] aria-invalid:ring-[rgba(239,68,68,0.1)] aria-invalid:border-[#ef4444] flex field-sizing-content min-h-16 w-full rounded-[8px] bg-[#161616] px-3 py-2 text-[13px] text-white shadow-none transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
