"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import { Timer } from "@/(auth)/AuthModal/components"

export default function AuthCompleted() {
  const router = useRouter()
  const params = useSearchParams()?.get("code")
  const provider = useSearchParams()?.get("provider")

  const userStore = useUserStore()

  const userId = useSearchParams()?.get("userId")
  const username = useSearchParams()?.get("username")
  const email = useSearchParams()?.get("email")
  const avatarUrl = useSearchParams()?.get("avatarUrl")

  useEffect(() => {
    userStore.setUser(userId ?? "", username ?? "", email ?? "", avatarUrl ?? "")
    if (provider === "google" || provider === "twitter") return closePage()
    //to prevent error about too many re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!params) {
    const error_description = encodeURIComponent("auth not completed")
    return router.push(`/error?error=${error_description}`)
  }

  function closePage() {
    window.close()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h1 className="text-success">Auth completed - delete email</h1>
      <Timer label="I close this page in" seconds={3} action={closePage} />
    </div>
  )
}
