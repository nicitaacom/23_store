"use client"

import { renderAsync } from "@react-email/render"
import { HiOutlineRefresh } from "react-icons/hi"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"
import { RequestReplanishmentEmail } from "@/emails/RequestReplanishmentEmail"

export function RequestReplanishmentButton({ product, className }: { product: TProductDB; className?: string }) {
  const toast = useToast()

  async function requestReplanishment() {
    if (!product.owner_id) {
      toast.show("error", "No owner id found", "Please contact support about this issue")
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

      // 3. Show toast
      toast.show("success", "You requested replanishment", "Now product owner know that somebody wants to buy it again")
    } catch (error) {
      toast.show("error", "Failed to request replenishment", error instanceof Error ? error.message : String(error))
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
      Request replenishment
    </Button>
  )
}
