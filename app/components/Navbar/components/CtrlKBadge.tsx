"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { useCtrlKModal } from "@/store/ui/useCtrlKModal"

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function CtrlKBadge() {
  const ctrlKModal = useCtrlKModal()
  const params = useSearchParams()?.get("modal")

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && !params) {
        //to prevent focus state on browser searchbar
        e.preventDefault()
        ctrlKModal.toggle()
      }
    }
    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [ctrlKModal, ctrlKModal.toggle, params])

  return (
    // eslint-disable-next-line local-rules/no-untranslated-ui -- keyboard shortcut glyph, not language-specific text
    <div className="bg-foreground-accent rounded inline-block text-title px-[4px]">⌘+K</div>
  )
}
