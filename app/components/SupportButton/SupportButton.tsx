"use client"

import { useRef } from "react"
import { BiSupport } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { Button } from "../ui"
import SupportButtonDropdown from "@/components/SupportButton/components/SupportButtonDropdown"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"

// export feault in order to lazy import this
export default function SupportButton() {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { unseenMessagesNumber } = useMessagesStore()
  const { isDropdown, closeDropdown, toggle } = useSupportDropdown()

  useEscOrClickOutside(dropdownRef, closeDropdown, { isHookEnabled: isDropdown })

  return (
    <div className="fixed bottom-4 right-4 z-[120] mobile:bottom-5 mobile:right-5" ref={dropdownRef}>
      <div
        className={twMerge(
          "pointer-events-none absolute bottom-[calc(100%+14px)] right-0 origin-bottom-right transition-all duration-200",
          isDropdown ? "visible translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0",
        )}>
        <div className="pointer-events-auto">
          <SupportButtonDropdown />
        </div>
      </div>

      <Button
        className="relative h-12 w-12 border border-success/30 bg-background/95 px-0 shadow-compact backdrop-blur-xl transition-colors duration-150 hover:border-success/45 hover:bg-foreground/80 desktop:h-14 desktop:w-14"
        variant="default-outline"
        size="icon-md"
        rounded="lg"
        onClick={toggle}
        aria-expanded={isDropdown}
        aria-label="Open support chat">
        <BiSupport className="h-6 w-6 text-icon-color desktop:h-7 desktop:w-7" />
        {unseenMessagesNumber > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded border border-background bg-success px-1.5 py-0.5 text-[10px] font-semibold text-title-foreground">
            {unseenMessagesNumber > 99 ? "99+" : unseenMessagesNumber}
          </span>
        )}
      </Button>
    </div>
  )
}
