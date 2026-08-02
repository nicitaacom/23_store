"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { AuthNotCompleted } from "./AuthNotCompleted"
import { BackToMainButton } from "./components/BackToMainButton"
import { EmailLinkInvalidOrExpired } from "./EmailLinkInvalidOrExpired"
import { ExchangeCookiesError } from "./ExchangeCookiesError"
import { NoCodeFoundError } from "./NoCodeFoundError"
import { useOAuthDebugStore } from "@/store/ui/useOAuthDebugStore"

const AUTH_ERROR_STORAGE_KEY = "auth:lastErrorDescription"
const AUTH_ERROR_TTL_MS = 5 * 60 * 1000

type TOAuthAttempt = {
  provider: string
  locale: string
  callbackBaseUrl: string
  redirectTo: string
  currentHref: string | null
  startedAt: string
}

type TPersistedAuthError = {
  value: string
  expiresAt: number
}

export default function Error() {
  const searchParams = useSearchParams()
  const { lastAttempt } = useOAuthDebugStore()
  const lastOAuthAttempt = useMemo<TOAuthAttempt | null>(() => {
    if (!lastAttempt) return null
    try { return JSON.parse(lastAttempt) as TOAuthAttempt } catch { return null }
  }, [lastAttempt])
  const liveErrorDescription = useMemo(() => {
    const errorFromHook = searchParams?.get("error_description")

    if (errorFromHook) return errorFromHook
    if (typeof window !== "undefined") {
      const errorFromLocation = new URLSearchParams(window.location.search).get("error_description")
      if (errorFromLocation) return errorFromLocation
    }

    return null
  }, [searchParams])

  const [persistedErrorDescription, setPersistedErrorDescription] = useState<string | null>(() => {
    if (typeof window === "undefined") return null

    const rawPersistedError = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY)
    if (!rawPersistedError) return null

    try {
      const persistedError = JSON.parse(rawPersistedError) as TPersistedAuthError

      if (!persistedError?.value || persistedError.expiresAt < Date.now()) {
        sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY)
        return null
      }

      return persistedError.value
    } catch (error) {
      sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY)
      console.error("[auth:oauth][error-page] failed to parse persisted auth error", error)
      return null
    }
  })

  const [prevLiveErrorDescription, setPrevLiveErrorDescription] = useState(liveErrorDescription)
  if (liveErrorDescription !== prevLiveErrorDescription) {
    setPrevLiveErrorDescription(liveErrorDescription)
    if (liveErrorDescription) {
      setPersistedErrorDescription(liveErrorDescription)
    }
  }

  const error_description = liveErrorDescription ?? persistedErrorDescription

  const expectedSupabaseCallbackUrl = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")

    return supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : null
  }, [])

  useEffect(() => {
    if (!liveErrorDescription) return

    const payload: TPersistedAuthError = {
      value: liveErrorDescription,
      expiresAt: Date.now() + AUTH_ERROR_TTL_MS,
    }

    sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, JSON.stringify(payload))
  }, [liveErrorDescription])

  if (error_description === "Email link is invalid or has expired") {
    return <EmailLinkInvalidOrExpired />
  }
  if (error_description === "No user found after exchanging cookies for registration") {
    return <ExchangeCookiesError message="No user found after exchanging cookies for registration" />
  }
  if (error_description === "No user found after exchanging cookies for recovering") {
    return <ExchangeCookiesError message="No user found after exchanging cookies for recovering" />
  }
  if (error_description === "No code found to exchange cookies for session") {
    return <NoCodeFoundError message="No user found after exchanging cookies for recovering" />
  }
  if (error_description === "You have no access to this route - your auth not completed") {
    return <AuthNotCompleted />
  }

  if (error_description?.startsWith("Unable to exchange external code")) {
    return (
      <div className="min-h-screen flex flex-col gap-y-5 items-center justify-center px-4">
        <div className="max-w-2xl flex flex-col gap-y-3 rounded-[20px] border border-danger/30 bg-background p-6 text-center">
          <p className="text-danger text-2xl font-semibold">
            Google auth failed before your app received a session - check the Google provider config below
          </p>
          <p>
            Supabase received Google&apos;s authorization code, but could not exchange it for tokens. This is usually a provider
            configuration problem, not a route-rendering problem in the app.
          </p>
          <p className="text-danger break-all">{error_description}</p>
          <p>
            The most likely fix is in <span className="font-semibold">Supabase Auth &gt; Providers &gt; Google</span>: re-paste the
            exact Google OAuth client ID and client secret for the OAuth app that owns the callback URI below.
          </p>
          {expectedSupabaseCallbackUrl && (
            <p className="break-all">
              Expected Supabase callback URI: <span className="font-mono">{expectedSupabaseCallbackUrl}</span>
            </p>
          )}
          {lastOAuthAttempt && (
            <div className="rounded-[14px] border border-border-color bg-foreground p-4 text-left">
              <p className="mb-2 text-sm font-semibold text-title">Last OAuth attempt</p>
              <pre className="whitespace-pre-wrap break-all text-xs text-subTitle">{JSON.stringify(lastOAuthAttempt, null, 2)}</pre>
            </div>
          )}
          <p className="text-sm text-subTitle">
            If the callback URI is already correct in Google Cloud, the next thing to fix is the Google client secret saved in
            Supabase.
          </p>
        </div>
        <BackToMainButton />
      </div>
    )
  }

  // Get error details from URL

  return (
    <div className="min-h-screen flex flex-col gap-y-4 items-center justify-center">
      <div className="flex flex-col justify-center items-center">
        {error_description ? (
          <p className="text-danger">{error_description}</p>
        ) : (
          <p className="text-danger">No error details were provided - contact support with what you were doing</p>
        )}
        <p>Please let us know how you got this error here - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      </div>
      <BackToMainButton />
    </div>
  )
}
