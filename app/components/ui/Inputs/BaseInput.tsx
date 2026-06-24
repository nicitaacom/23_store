import React, { forwardRef } from "react"
import { twMerge } from "tailwind-merge"

// The shared text-input look (lighter "soft card" vibe + soft GREEN/brand focus ring), owned by ONE
// component so the look lives in a single place. Input / FormInput / SearchInput and the variant
// inputs compose this. ProductInput and MessageInput keep their own styles on purpose.
export const BaseInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={twMerge(
        "h-8 w-full rounded-lg border border-border-color/25 bg-background/60 px-3 text-sm text-title outline-none transition-all duration-150 placeholder:text-subTitle/55 focus:border-brand/50 focus:bg-background focus:ring-2 focus:ring-brand/15",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)

BaseInput.displayName = "BaseInput"
