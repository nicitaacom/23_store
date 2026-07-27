"use client"

import { useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BiSupport } from "react-icons/bi"

import { Button } from "../ui"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useMessages } from "@/store/ui/useMessages"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import SupportButtonDropdown from "@/components/SupportButton/components/SupportButtonDropdown"

// export feault in order to lazy import this
// http://localhost:6006/?path=/story/support-supportexample--closed-button
export default function SupportButton() {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { unseenMessagesNumber } = useMessages()
  const { isDropdown, closeDropdown, toggle } = useSupportDropdown()

  useEscOrClickOutside(dropdownRef, closeDropdown, { ignoreInputs: true, isHookEnabled: isDropdown })

  return (
    <div className="fixed bottom-4 right-4 z-[120] mobile:bottom-5 mobile:right-5" ref={dropdownRef}>
      <AnimatePresence>
        {isDropdown && (
          <motion.div
            className="pointer-events-auto absolute bottom-[calc(100%+14px)] right-0 origin-bottom-right"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <SupportButtonDropdown />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        className="relative h-12 w-12 border border-success/30 bg-background/95 px-0 shadow-compact backdrop-blur-xl transition-colors duration-150 hover:border-success/45 hover:bg-foreground/80 desktop:h-14 desktop:w-14"
        data-cy="open-support"
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
