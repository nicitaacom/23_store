"use client"

import { useEffect, useState } from "react"
import { HiOutlineRefresh } from "react-icons/hi"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { emailsSDK } from "@/sdk/EmailsSDK/EmailsSDK"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"

export function RequestReplanishmentButton({ product, className }: { product: TProductDB; className?: string }) {
  const toast = useToast()
  const [html] = useState("")

  // 1. Render TSX to html
  useEffect(() => {
    async function renderEmail() {
      if (product.owner_id) {
        // TODO - fix error about keys in react here
        // const emailMessageString = await renderAsync(<RequestReplanishmentEmail product={product} key={product.id} />, {
        //   pretty: true,
        // })
        // setHtml(emailMessageString)
      } else {
        toast.show("error", "No owner id found", "Please contact support about this issue")
      }
    }
    renderEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function requestReplanishment() {
    try {
      // 2. Send email to owner and let product owner to unsubscribe from taht email
      await emailsSDK.sendRequestReplanishmentEmail({
        owner_id: product.owner_id,
        subject: "Request replanishment",
        html: html,
      })

      // 3. TODO - Add amount of requests about replanishment
      // https://github.com/users/nicitaacom/projects/5/views/1?sortedBy%5Bdirection%5D=desc&sortedBy%5BcolumnId%5D=59471618&pane=issue&itemId=50280346

      // 4. Show toast
      toast.show("success", "You requested replanishment", "Now product onwer know that somebody wants to buy it again")
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
