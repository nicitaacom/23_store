"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import { Timer } from "@/(auth)/components"

export default function AuthCompleted() {
  const router = useRouter()
  const params = useSearchParams().get("code")
  if (!params) {
    const error_description = encodeURIComponent("auth not completed")
    router.push(`/error?error=${error_description}`)
  }

  const userStore = useUserStore()

  const userId = useSearchParams().get("userId")
  const username = useSearchParams().get("username")
  const email = useSearchParams().get("email")
  const avatar_url = useSearchParams().get("avatar_url")
  useEffect(() => {
    userStore.setUser(userId ?? "", username ?? "", email ?? "", avatar_url ?? "")
    router.push("/")
    //to prevent error about too many re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h1 className="text-success">Auth completed - you may close this page</h1>
      <Timer label="Redirect back to main after" seconds={5} action={() => router.replace("/")} />
    </div>
  )
}