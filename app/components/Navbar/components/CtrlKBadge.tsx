"use client"

import { useCtrlKModal } from "@/store/ui/ctrlKModal"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function CtrlKBadge() {
  const ctrlKModal = useCtrlKModal()
  const params = useSearchParams().get("modal")

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

  return <div className="bg-icon-color rounded inline-block text-title-foreground px-[4px] py-[2px[">⌘+K</div>
}
