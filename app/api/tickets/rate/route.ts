import { NextResponse } from "next/server"
import { pusherServer } from "@/libs/pusher"

import supabaseAdmin from "@/libs/supabaseAdmin"
import { ITicket } from "@/interfaces/ITicket"

export type TAPITicketsRate = {
  ticketId: string
  rate: number
}

export async function POST(req: Request) {
  const { ticketId, rate } = (await req.json()) as TAPITicketsRate
  const { error } = await supabaseAdmin.from("tickets").update({ is_open: false, rate: rate }).eq("id", ticketId)
  if (error) return NextResponse.json({ error: `Error in api/tickets/route.ts\n ${error.message}` }, { status: 400 })
  // to don't show ticket it on support side
  await pusherServer.trigger("tickets", "tickets:close", {
    id: ticketId,
    is_open: false,
  } as ITicket)
  // to clear messages on user side
  await pusherServer.trigger(ticketId, "tickets:close", null)

  return NextResponse.json({ message: "Ticket marked as completed (ticket closed)" }, { status: 200 })
}
