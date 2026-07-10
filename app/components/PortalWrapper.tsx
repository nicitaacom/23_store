"use client"
import { ReactNode } from "react"
import { createPortal } from "react-dom"

import { useHasMounted } from "@/hooks/useHasMounted"

export function PortalWrapper({ children }: { children: ReactNode }) {
  const mounted = useHasMounted()

  return mounted ? createPortal(children, document.body) : null
}
