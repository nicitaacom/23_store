"use client"

import useDarkModeStore from "@/store/ui/useDarkModeStore"

interface DarkModeRadioButtonProps {
  className?: string
  ariaLabel: string
}

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function DarkModeRadioButton({ ariaLabel, className }: DarkModeRadioButtonProps) {
  const mode = useDarkModeStore()

  return (
    <button
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-all duration-300 hover:brightness-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${className ?? ""}`}
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={mode.isDarkMode}
      onClick={mode.toggleDarkMode}>
      <span className="relative block h-5 w-9 rounded-full border-[3px] border-icon-color" aria-hidden="true">
        <span
          className={`absolute left-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-icon-color transition-transform duration-500 ${
            mode.isDarkMode ? "translate-x-4" : "translate-x-0"
          }`}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}
