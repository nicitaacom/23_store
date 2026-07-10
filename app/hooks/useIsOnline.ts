"use client"

import { useEffect, useState } from "react"

/**
 * Tracks the browser's network status via the `online` / `offline` window events.
 *
 * SSR-safe: starts as `true` (server has no `navigator`) and syncs to the real
 * value on mount, so it never reports a false "offline" during hydration.
 *
 * ## Usage
 * ```tsx
 * const isOnline = useIsOnline()
 * if (!isOnline) return <OfflineBanner />
 * ```
 */
export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine))

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
