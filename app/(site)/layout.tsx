import { Metadata } from "next"

import getInitialMessagesByTicketId from "@/actions/getInitialMessagesByTicketId"
import getTicketId from "@/actions/getTicketId"

export const metadata: Metadata = {
  title: "23_store - products",
  description: "Store better than amazon",
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const ticketId = await getTicketId()
  const initial_messages = await getInitialMessagesByTicketId(ticketId)

  return <div>{children}</div>
}
