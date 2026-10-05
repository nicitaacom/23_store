"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

import { useNoProductsRedirect } from "./hooks/useNoProductsRedirect"
import { usePaymentSteps } from "./hooks/usePaymentSteps"
import { trackBuyingFlowEvent } from "@/utils/trackBuyingFlowEvent"
import { useScopedI18n } from "@/locales/client"
import { Timer } from "@/components/ui"

export default function Payment() {
  const router = useRouter()
  const status = useSearchParams()?.get("status") ?? null
  const sessionId = useSearchParams()?.get("session_id") ?? null
  const { cartStore } = usePaymentSteps(status, sessionId)
  const t = useScopedI18n("payment")

  useNoProductsRedirect()

  useEffect(() => {
    if (status === "success") trackBuyingFlowEvent({ event: "order_placed" })
  }, [status])

  if (!cartStore.products || Object.keys(cartStore.products).length === 0) {
    return null
  }

  return (
    <section
      className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full flex-col items-center justify-center px-2 py-3 text-center">
      {status === "success" ? (
        <>
          <Image
            className="h-auto w-36 max-w-[70vw] tablet:w-48 laptop:w-64"
            src="/success-checkmark.gif"
            alt={t("success_checkmark")}
            width={256}
            height={256}
            priority
          />
          <h1 className="text-2xl mb-2">
            {process.env.NODE_ENV === "development" ? `Test ${t("successfull")}` : t("successfull")}
          </h1>
          <p>{t("check_sent_to_your_email")}</p>
          <p className="flex flex-row">
            {t("redirecting_to_homepage_in")} <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      ) : (
        <>
          <Image
            className="h-auto w-36 max-w-[70vw] tablet:w-48 laptop:w-64"
            src="/error-checkmark.gif"
            alt={t("error_checkmark")}
            width={256}
            height={256}
            priority
          />
          <h1 className="text-2xl mb-2">{t("canceled")}</h1>
          <p className="flex flex-row">
            {t("redirecting_to_homepage_in")} <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      )}
    </section>
  )
}
