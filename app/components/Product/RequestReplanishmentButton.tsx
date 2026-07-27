"use client"

import { useState } from "react"
import { renderAsync } from "@react-email/render"
import { HiOutlineRefresh } from "react-icons/hi"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"
import { RequestReplanishmentEmail } from "@/emails/RequestReplanishmentEmail"

// http://localhost:6006/?path=/story/commerce-product--normal
export function RequestReplanishmentButton({ product, className }: { product: TProductDB; className?: string }) {
  const toast = useToast()
  const t = useScopedI18n("product")
  const [requestsAmount, setRequestsAmount] = useState(product.replanishment_requests_count ?? 0)

  async function requestReplanishment() {
    if (!product.owner_id) {
      toast.show("error", t("error.no_owner_id_title"), t("error.no_owner_id_body"))
      return
    }

    try {
      // 1. Render TSX to html - on click, like requestBetterPrices does, so the body is never empty
      const html = await renderAsync(<RequestReplanishmentEmail product={product} />, { pretty: true })

      // 2. Send email to owner and let product owner to unsubscribe from that email
      await emailsSDK.sendRequestReplanishmentEmail({
        owner_id: product.owner_id,
        subject: "Request replanishment",
        html: html,
      })

      // 3. Count the request so the owner sees how many buyers are waiting for this product
      const updateDBReplanishmentRequestsResp = await productsSDK.updateDBReplanishmentRequests({ product_id: product.id })
      if ("replanishment_requests_count" in updateDBReplanishmentRequestsResp) {
        setRequestsAmount(updateDBReplanishmentRequestsResp.replanishment_requests_count)
      }

      // 4. Show toast
      toast.show("success", t("success.replenishment_title"), t("success.replenishment_body"))
    } catch (error) {
      toast.show("error", t("error.replenishment_title"), error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Button
      className={twMerge("text-base font-medium", className)}
      variant="info-outline"
      size="lg"
      rounded="sm"
      shadow="none"
      rightIcon={<HiOutlineRefresh className="text-lg" />}
      onClick={requestReplanishment}>
      {t("request_replenishment")}
      {requestsAmount > 0 && (
        <span className="ml-2 rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-xs font-semibold text-info">
          {requestsAmount}
        </span>
      )}
    </Button>
  )
}
