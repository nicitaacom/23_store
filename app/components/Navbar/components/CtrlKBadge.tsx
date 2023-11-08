"use client"

import { useCtrlKModal } from "@/store/ui/ctrlKModal"
import { useEffect } from "react"

export function CtrlKBadge() {
  const ctrlKModal = useCtrlKModal()

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        //to prevent focus state on browser searchbar
        e.preventDefault()
        ctrlKModal.toggle()
      }
    }
    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [ctrlKModal, ctrlKModal.toggle])

  return <div className="bg-icon-color rounded inline-block text-title-foreground px-[4px] py-[2px[">⌘+K</div>
}
