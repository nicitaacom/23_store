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
        className="relative h-14 w-14 rounded-full border border-success/30 bg-background/95 px-0 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-success/45 hover:bg-foreground/80 desktop:h-16 desktop:w-16"
        variant="default-outline"
        size="icon-md"
        rounded="full"
        onClick={toggle}
        aria-expanded={isDropdown}
        aria-label="Open support chat">
        <BiSupport className="h-7 w-7 text-icon-color desktop:h-8 desktop:w-8" />
        {unseenMessagesNumber > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[22px] rounded-full border border-background bg-success px-1.5 py-0.5 text-[11px] font-semibold text-title-foreground">
            {unseenMessagesNumber > 99 ? "99+" : unseenMessagesNumber}
          </span>
        )}
      </Button>
    </div>
  )
}
