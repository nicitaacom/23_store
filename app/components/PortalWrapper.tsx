"use client"
import { createPortal } from "react-dom"
import { ReactNode, useEffect, useState } from "react"

export function PortalWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return mounted ? createPortal(children, document.body) : null
}
