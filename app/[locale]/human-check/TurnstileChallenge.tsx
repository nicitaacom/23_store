"use client"

import { useEffect, useRef, useState } from "react"

import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import { getSafeNextPath } from "@/utils/turnstile"
import { Button } from "@/components/ui"

type TurnstileChallengeProps = {
  locale: string
  nextPath: string
}

export function TurnstileChallenge({ locale, nextPath }: TurnstileChallengeProps) {
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const renderTurnstile = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile || widgetIdRef.current) {
        return
      }

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY,
        theme: "auto",
        callback: async (token: string) => {
          setStatus("verifying")
          setErrorMessage(null)

          try {
            const payload = await accountSDK.verifyTurnstile(token)

            if (!payload?.success) {
              setStatus("error")
              setErrorMessage(payload?.error || "Turnstile verification failed")
              window.turnstile?.reset(widgetIdRef.current ?? undefined)
              return
            }

            setStatus("verified")
            window.location.assign(getSafeNextPath(nextPath, locale))
          } catch (error) {
            setStatus("error")
            setErrorMessage(error instanceof Error ? error.message : "Turnstile verification failed")
            window.turnstile?.reset(widgetIdRef.current ?? undefined)
          }
        },
        "error-callback": () => {
          setStatus("error")
          setErrorMessage("Cloudflare Turnstile did not initialize correctly. Please try again.")
        },
        "expired-callback": () => {
          setStatus("idle")
          setErrorMessage("Challenge expired. Please complete it again.")
          window.turnstile?.reset(widgetIdRef.current ?? undefined)
        },
      })
    }

    const intervalId = window.setInterval(() => {
      renderTurnstile()
      if (widgetIdRef.current) {
        window.clearInterval(intervalId)
      }
    }, 250)

    renderTurnstile()

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [locale, nextPath])

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-background/92 px-4 py-8 backdrop-blur-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_35%)]" />
      <div className="relative flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl rounded-[28px] border border-border-color/80 bg-foreground/95 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.3)] md:p-8">
          <div className="mb-6 flex flex-col gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-subTitle">Security Check</p>
            <h1 className="text-3xl font-semibold text-title">Verify you&apos;re human</h1>
            <p className="text-subTitle">
              Complete the Cloudflare challenge before using the website. This protects the app from bots and request floods.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-[24px] border border-border-color/70 bg-background px-4 py-6">
            <div className="min-h-[70px]" ref={turnstileRef} />

            {status === "verifying" && <p className="text-sm text-subTitle">Verifying challenge...</p>}
            {status === "verified" && <p className="text-sm text-success">Verification complete. Redirecting...</p>}
            {errorMessage && <p className="text-center text-sm text-danger">{errorMessage}</p>}
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="default-outline" onClick={() => window.location.assign(`/${locale}`)}>
              Back to main
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
