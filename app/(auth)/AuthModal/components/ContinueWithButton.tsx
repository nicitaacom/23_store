import React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/Button"
import supabaseClient from "@/libs/supabase/supabaseClient"
import useToast from "@/store/ui/useToast"

interface ContinueWithButtonProps {
  provider: "google" | "faceit" | "twitter"
  className?: string
  href?: string
}

export function ContinueWithButton({ href, provider, className }: ContinueWithButtonProps) {
  const toast = useToast()
  async function continueWith(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (provider === "google") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${location.origin}/auth/callback/oauth?provider=google` },
        })
        if (error) throw error
      } else if (provider === "faceit") {
        throw Error("Faceit not implemented - if you know how - contact me: nicitaacom@gmail.com")
        // TODO - add faceit provider
      } else if (provider === "twitter") {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "twitter",
          options: { redirectTo: `${location.origin}/auth/callback/oauth?provider=twitter` },
        })
        if (error) throw error
      }
    } catch (error) {
      toast.show("error", `Error continuing with ${provider}`, error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <form onSubmit={continueWith}>
      <Button className={`min-h-[48px] ${className}`} href={href} target="_blank" variant="continue-with">
        {provider === "google" ? (
          <Image src="/google.png" alt="Continue with Google" width={24} height={24} priority />
        ) : provider === "faceit" ? (
          <Image src="/faceit.png" alt="Continue with Faceit" width={24} height={24} priority />
        ) : (
          <Image
            className="w-[24px] h-[19px]"
            src="/twitter.png"
            alt="Continue with Twitter"
            width={24}
            height={19}
            priority
          />
        )}
      </Button>
    </form>
  )
}
