"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import { setCookie } from "@/utils/helpersCSR"
import { Timer } from "../../AuthModal/components"
import { useI18n } from "@/locales/client"

export default function AuthCompleted() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useI18n()

  const { setUser } = useUserStore()

  // 1. helper to safely read params
  const getParam = (key: string) => searchParams?.get(key)?.trimEnd() || ""

  const params = getParam("code")
  const provider = getParam("provider")

  const userId = getParam("userId")
  const username = getParam("username")
  const email = getParam("email")
  const avatarUrl = getParam("avatarUrl")

  console.log(29, "userId - ", userId)

  useEffect(() => {
    // 2. provider redirect (silent)
    // if (provider === "google" || provider === "twitter") {
    //   router.replace("/")
    //   return
    // }

    // 3. validate auth completion
    if (!params) {
      const errorDescription = encodeURIComponent("auth not completed")
      router.replace(`/error?error=${errorDescription}`)
      return
    }

    // 4. validate required user fields
    const requiredFields = [
      { key: "userId", value: userId },
      { key: "username", value: username },
      { key: "email", value: email },
      { key: "avatarUrl", value: avatarUrl },
    ]

    const missing: string[] = []

    for (let index = 0; index < requiredFields.length; index++) {
      if (!requiredFields[index].value) missing.push(requiredFields[index].key)
    }

    if (missing.length) throw Error(`Auth failed, missing: ${missing.join(", ")}`)

    // 5. persist user
    setUser(userId, username, email, avatarUrl)
    setCookie("avatarUrl", avatarUrl)
    router.prefetch("/")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 6. nothing to render for oauth providers
  if (provider === "google" || provider === "twitter") return null

  function closePage() {
    window.close()
  }

  return (
    <div className="min-h-screen flex flex-col gap-y-8 justify-center items-center pb-16 mobile:pb-24 tablet:pb-32 laptop:pb-64">
      <h1 className="text-success text-xl mobile:text-2xl tablet:text-4xl laptop:text-5xl desktop:text-6xl">
        {t("auth.verify.success")}
      </h1>
      <Timer
        label={t("auth.page_close_in")}
        labelClassName="mobile:text-lg tablet:text-xl laptop:text-2xl desktop:text-3xl text-subTitle"
        seconds={3}
        action={closePage}
      />
    </div>
  )
}
