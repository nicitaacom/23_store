"use client"

import { HiOutlineRefresh } from "react-icons/hi"
import { Button } from ".."
import axios from "axios"

import useToast from "@/store/ui/useToast"
import { TAPISendEmailRequestReplanishment } from "@/api/send-email/request-replanishment/route"
import { useEffect, useState } from "react"
import RequestReplanishmentEmail from "@/emails/RequestReplanishmentEmail"
import { TProductDB } from "@/interfaces/product/TProductDB"
// import { renderAsync } from "@react-email/render"

export function RequestReplanishmentButton({ product }: { product: TProductDB }) {
  const toast = useToast()
  const [html, setHtml] = useState("")

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
    // 2. Send email to owner and let product owner to unsubscribe from taht email
    await axios.post("/api/send-email/request-replanishment", {
      owner_id: product.owner_id,
      subject: "Request replanishment",
      html: html,
    } as TAPISendEmailRequestReplanishment)
    // 3. TODO - Add amount of requests about replanishment
    // https://github.com/users/nicitaacom/projects/5/views/1?sortedBy%5Bdirection%5D=desc&sortedBy%5BcolumnId%5D=59471618&pane=issue&itemId=50280346

    // 4. Show toast
    toast.show("success", "You requested replanishment", "Now product onwer know that somebody wants to buy it again")
  }

  return (
    <Button className="text-lg flex flex-row gap-x-2" variant="info-outline" onClick={requestReplanishment}>
      Request replenishment
      <HiOutlineRefresh />
    </Button>
  )
}
