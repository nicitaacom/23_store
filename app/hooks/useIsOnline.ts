"use client"

import { useSyncExternalStore } from "react"

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
  const subscribe = (notify: () => void) => {
    window.addEventListener("online", notify)
    window.addEventListener("offline", notify)
    return () => {
      window.removeEventListener("online", notify)
      window.removeEventListener("offline", notify)
    }
  }

  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
