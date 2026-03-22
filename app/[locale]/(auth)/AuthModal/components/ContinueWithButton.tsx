import React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/Button"
import supabaseClient from "@/libs/supabase/supabaseClient"
import useToast from "@/store/ui/useToast"
import { useCurrentLocale, useI18n } from "@/locales/client"

interface ContinueWithButtonProps {
  provider: "google" | "faceit" | "twitter"
  className?: string
  href?: string
}

export function ContinueWithButton({ href, provider, className }: ContinueWithButtonProps) {
  const toast = useToast()
  const t = useI18n()
  const locale = useCurrentLocale()

  async function continueWith(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (provider === "google") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${location.origin}/${locale}/auth/callback/oauth?provider=google` },
        })
        if (error) throw Error(error.message)
      } else if (provider === "faceit") {
        throw Error(`${t("auth.error.faceit_not_implemented")} ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`)
        // TODO - add faceit provider
      } else if (provider === "twitter") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "twitter",
          options: { redirectTo: `${location.origin}/${locale}/auth/callback/oauth?provider=twitter` },
        })
        if (error) throw Error(error.message)
      }
    } catch (error) {
      toast.show(
        "error",
        `${t("auth.error.continuing_with")} ${provider}`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return (
    <form onSubmit={continueWith}>
      <Button className={`min-h-[48px] ${className}`} href={href} target="_blank" type="submit" variant="continue-with">
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
