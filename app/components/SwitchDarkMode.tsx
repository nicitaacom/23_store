"use client"

import useDarkModeStore from "@/store/ui/useDarkModeStore"

interface SwitchProps {
  className?: string
  ariaLabel: string
}

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function SwitchDarkMode({ ariaLabel, className }: SwitchProps) {
  const mode = useDarkModeStore()

  return (
    <button
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-all duration-300 hover:brightness-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 ${className ?? ""}`}
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={mode.isDarkMode}
      onClick={mode.toggleDarkMode}>
      <span className="relative h-5 w-9 rounded-full border-[3px] border-icon-color">
        <span
          className={`absolute top-0 h-[10px] w-[10px] translate-y-[20%] rounded-full bg-icon-color transition-transform duration-500 ${
            mode.isDarkMode ? "translate-x-[180%]" : "translate-x-[20%]"
          }`}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}
