"use client"

import { useEffect } from "react"

import { resolveSeasonalTheme } from "@/utils/resolveSeasonalTheme"

function syncThemeWithLocalMonth() {
  const localMonth = new Date().getMonth() + 1
  document.documentElement.dataset.theme = resolveSeasonalTheme(localMonth)
}

// http://localhost:6006/?path=/story/foundations-design-tokens--colors
export function SeasonalThemeLifecycle() {
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>

    const scheduleNextMidnightSync = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)

      midnightTimer = setTimeout(() => {
        syncThemeWithLocalMonth()
        scheduleNextMidnightSync()
      }, nextMidnight.getTime() - now.getTime())
    }

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncThemeWithLocalMonth()
    }

    syncThemeWithLocalMonth()
    scheduleNextMidnightSync()
    document.addEventListener("visibilitychange", syncWhenVisible)
    window.addEventListener("pageshow", syncThemeWithLocalMonth)

    return () => {
      clearTimeout(midnightTimer)
      document.removeEventListener("visibilitychange", syncWhenVisible)
      window.removeEventListener("pageshow", syncThemeWithLocalMonth)
    }
  }, [])

  return null
}
