"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import { Timer } from "@/(auth)/AuthModal/components"
import { setCookie } from "@/utils/helpersCSR"

export default function AuthCompleted() {
  const router = useRouter()
  const params = useSearchParams()?.get("code")?.trimEnd()
  const provider = useSearchParams()?.get("provider")?.trimEnd()

  const userStore = useUserStore()

  //I use ?.trimEnd() to delete spaces in end of line that cause enter in auth/callback/route.ts (NextResponse.redirect)
  const userId = useSearchParams()?.get("userId")?.trimEnd()
  const username = useSearchParams()?.get("username")?.trimEnd()
  const email = useSearchParams()?.get("email")?.trimEnd()
  const avatarUrl = useSearchParams()?.get("avatarUrl")?.trimEnd()

  useEffect(() => {
    userStore.setUser(userId ?? "", username ?? "", email ?? "", avatarUrl ?? "")
    if (avatarUrl) setCookie("avatarUrl", avatarUrl)
    router.prefetch("/")
    //to prevent error about too many re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (provider === "google" || provider === "twitter") {
      router.replace("/")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (provider === "google" || provider === "twitter") {
    return null
  }

  if (!params) {
    const error_description = encodeURIComponent("auth not completed")
    return router.push(`/error?error=${error_description}`)
  }

  function closePage() {
    window.close()
  }

  return (
    <div className="min-h-screen flex flex-col gap-y-8 justify-center items-center pb-16 mobile:pb-24 tablet:pb-32 laptop:pb-64">
      <h1 className="text-success text-xl mobile:text-2xl tablet:text-4xl laptop:text-5xl desktop:text-6xl">
        Auth completed - delete email
      </h1>
      <Timer
        label="I close this page in"
        labelClassName="mobile:text-lg tablet:text-xl laptop:text-2xl desktop:text-3xl text-subTitle"
        seconds={3}
        action={closePage}
      />
    </div>
  )
}
