"use client"

import { useEffect } from "react"

let activeLocks = 0
let previousStyles: { bodyOverflow: string; documentOverflow: string; bodyPaddingRight: string } | null = null

export function useModalScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    if (activeLocks === 0) {
      previousStyles = {
        bodyOverflow: document.body.style.overflow,
        documentOverflow: document.documentElement.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
      }

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.documentElement.style.overflow = "hidden"
      document.body.style.overflow = "hidden"
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    activeLocks += 1
    return () => {
      activeLocks -= 1
      if (activeLocks > 0 || !previousStyles) return

      document.body.style.overflow = previousStyles.bodyOverflow
      document.documentElement.style.overflow = previousStyles.documentOverflow
      document.body.style.paddingRight = previousStyles.bodyPaddingRight
      previousStyles = null
    }
  }, [isLocked])
}
