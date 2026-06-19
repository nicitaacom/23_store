"use client"

import { useEffect } from "react"
import { getCookie } from "@/utils/helpersCSR"
import { setAnonymousId } from "@/utils/setAnonymousId"
import { trackVisitAction } from "@/[locale]/(site)/stats/actions/trackVisitAction"

export function UTMTracker({ userId }: { userId: string | undefined }) {
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries())
    const currentUrl = window.location.href
    // even if it's no params - still track visit as organic
    const trackingUserId = userId || getCookie("anonymousId") || setAnonymousId()

    async function trackVisit() {
      await trackVisitAction(trackingUserId, params, currentUrl)
      const url = window.location.origin + window.location.pathname
      window.history.replaceState({}, "", url)
    }

    trackVisit()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
