"use client"

import { useSyncExternalStore } from "react"

import type { TSiteTheme } from "@/ts/types/TSiteTheme"

const DEFAULT_SITE_THEME: TSiteTheme = "default"

function subscribeToThemeChange(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  })

  return () => observer.disconnect()
}

function getThemeSnapshot(): TSiteTheme {
  return (document.documentElement.dataset.theme as TSiteTheme | undefined) ?? DEFAULT_SITE_THEME
}

function getServerThemeSnapshot(): TSiteTheme {
  return DEFAULT_SITE_THEME
}

export function useSiteTheme() {
  return useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, getServerThemeSnapshot)
}
