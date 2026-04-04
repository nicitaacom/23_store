"use client"

import { useEffect } from "react"
import { getCookie } from "@/utils/helpersCSR"
import { setAnonymousId } from "@/utils/setAnonymousId"
import { utmSDK } from "@/sdk/UTMSDK/UTMSDK"

export function UTMTracker({ userId }: { userId: string | undefined }) {
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries())
    // even if it's no params - still track visit as organic
    const trackingUserId = userId || getCookie("anonymousId") || setAnonymousId()

    async function trackVisit() {
      await utmSDK.trackVisit({
        userId: trackingUserId,
        searchParams: params,
      })
      const url = window.location.origin + window.location.pathname
      window.history.replaceState({}, "", url)
    }

    trackVisit()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
