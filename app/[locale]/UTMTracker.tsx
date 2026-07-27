"use client"

import { useEffect } from "react"

import { getCookie } from "@/utils/helpersCSR"
import { setAnonymousId } from "@/utils/setAnonymousId"
import { trackVisitAction } from "@/actions/trackVisitAction"

// http://localhost:6006/?path=/story/navigation-appshell--sign-in
export function UTMTracker({ userId }: { userId: string | undefined }) {
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search).entries())
    const currentUrl = window.location.href
    // even if it's no params - still track visit as organic
    const trackingUserId = userId || getCookie("anonymousId") || setAnonymousId()

    async function trackVisit() {
      await trackVisitAction(trackingUserId, params, currentUrl)
      const remainingParams = new URLSearchParams(window.location.search)
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        remainingParams.delete(key)
      }
      const search = remainingParams.toString()
      const url = window.location.origin + window.location.pathname + (search ? `?${search}` : "")
      window.history.replaceState({}, "", url)
    }

    trackVisit()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
