"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

import { useNoProductsRedirect } from "./hooks/useNoProductsRedirect"
import { usePaymentSteps } from "./hooks/usePaymentSteps"
import { useScopedI18n } from "@/locales/client"
import { Timer } from "@/components/ui"

export default function Payment() {
  const router = useRouter()
  const status = useSearchParams()?.get("status") ?? null
  const session_id = useSearchParams()?.get("session_id") ?? null
  const { cartStore } = usePaymentSteps(status, session_id)
  const t = useScopedI18n("payment")

  useNoProductsRedirect()

  if (!cartStore.products || Object.keys(cartStore.products).length === 0) {
    return null
  }

  return (
    <section
      className="absolute left-[50%] top-[50%] translate-x-[-50%]
     translate-y-[-100%] tablet:translate-y-[-75%] laptop:translate-y-[-50%] 
    flex flex-col text-center justify-center items-center w-full">
      {status === "success" ? (
        <>
          <Image
            style={{ width: "auto" }}
            src="/success-checkmark.gif"
            alt={t("success_checkmark")}
            width={256}
            height={256}
            priority
          />
          <h1 className="text-2xl mb-2">{t("successfull")}</h1>
          <p>{t("check_sent_to_your_email")}</p>
          <p className="flex flex-row">
            {t("redirecting_to_homepage_in")} <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      ) : (
        <>
          <Image style={{ width: "auto" }} src="/error-checkmark.gif" alt="Error Checkmark" width={256} height={256} priority />
          <h1 className="text-2xl mb-2">{t("canceled")}</h1>
          <p className="flex flex-row">
            {t("redirecting_to_homepage_in")} <Timer seconds={4} action={() => router.replace("/")} />
          </p>
        </>
      )}
    </section>
  )
}
