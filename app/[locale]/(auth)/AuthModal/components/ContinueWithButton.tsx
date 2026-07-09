import React from "react"
import Image from "next/image"
import { twMerge } from "tailwind-merge"

import { Button } from "@/components/ui/Button"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { useOAuthDebugStore } from "@/store/ui/useOAuthDebugStore"
import useToast from "@/store/ui/useToast"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"

interface ContinueWithButtonProps {
  provider: "google" | "faceit" | "twitter"
  className?: string
  href?: string
}

export function ContinueWithButton({ href, provider, className }: ContinueWithButtonProps) {
  const toast = useToast()
  const t = useI18n()
  const locale = useCurrentLocale()
  const { setLastAttempt } = useOAuthDebugStore()

  async function continueWith(e: React.FormEvent) {
    e.preventDefault()
    try {
      const callbackBaseUrl = getAuthCallbackBaseUrl()
      const redirectTo = `${callbackBaseUrl}/${locale}/auth/callback/oauth?provider=${provider}`
      const oauthDebugPayload = {
        provider,
        locale,
        callbackBaseUrl,
        redirectTo,
        currentHref: typeof window !== "undefined" ? window.location.href : null,
        startedAt: new Date().toISOString(),
      }

      setLastAttempt(JSON.stringify(oauthDebugPayload))

      console.log("[auth:oauth][client] starting OAuth flow", {
        ...oauthDebugPayload,
      })

      if (provider === "google") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        })
        if (error) throw Error(error.message)
      } else if (provider === "faceit") {
        throw Error(`${t("auth.error.faceit_not_implemented")} ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`)
        // TODO - add faceit provider
      } else if (provider === "twitter") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "twitter",
          options: { redirectTo },
        })
        if (error) throw Error(error.message)
      }
    } catch (error) {
      console.error("[auth:oauth][client] failed to start OAuth flow", {
        provider,
        locale,
        error: error instanceof Error ? error.message : String(error),
      })
      toast.show(
        "error",
        `${t("auth.error.continuing_with")} ${provider}`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return (
    <form onSubmit={continueWith}>
      <Button
        className={twMerge("h-12 rounded-xl", className)}
        href={href}
        type="submit"
        variant="continue-with"
        fullWidth>
        {provider === "google" ? (
          <Image src="/google.png" alt={t("auth.continue_with_google")} width={24} height={24} priority />
        ) : provider === "faceit" ? (
          <Image src="/faceit.png" alt={t("auth.continue_with_faceit")} width={24} height={24} priority />
        ) : (
          <Image
            className="w-[24px] h-[19px]"
            src="/twitter.png"
            alt={t("auth.continue_with_twitter")}
            width={24}
            height={19}
            priority
          />
        )}
      </Button>
    </form>
  )
}
