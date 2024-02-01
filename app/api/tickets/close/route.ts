import { NextResponse } from "next/server"
import { pusherServer } from "@/libs/pusher"

import { ITicket } from "@/interfaces/support/ITicket"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPITicketsClose = {
  ticketId: string
  closedBy: "user" | "support"
}

/*
What should happeining when you make post to this roure
If closedBy user
1. On user side - clear messages
2. On support side - router.push('support/ticekts/') and show toast 'user closed ticket'
If closedBy support
1. On user side - clear messages and show 'rate this ticket'
2. On support side - router.push('support/ticekts/')
*/

export async function POST(req: Request) {
  const { ticketId, closedBy } = (await req.json()) as TAPITicketsClose

  // 1. Update 'tickets' to is_open:false
  const { error } = await supabaseAdmin.from("tickets").update({ is_open: false }).eq("id", ticketId)
  if (error) return NextResponse.json({ error: `Error in api/tickets/route.ts\n ${error.message}` }, { status: 400 })

  if (closedBy === "user") {
    // On user side - clear messages
    // Pass in ticketId channel null data and trigger 'tickets:closeBySupport' event
    await pusherServer.trigger(ticketId, "tickets:closeBySupport", null)
    // On support side - router.push('support/ticekts/') and show toast 'user closed ticket'
    // Pass id and is_open:false in 'tickets' channel and trigger 'tickets:closeByUser' event
    await pusherServer.trigger("tickets", "tickets:closeByUser", {
      id: ticketId,
      is_open: false,
    } as ITicket)
  }
  if (closedBy === "support") {
    // separate event is required for action when support close ticket (if you change event to tickets:close it will not work)
    // I mean if you fire some event this event will be fird in all channels but data will be passed to channels in 1st prop
    // to show on user side 'rate this ticket'
    // So trigger 'tickets:closeBySupport' event and pass id in data in 'ticketId' and 'tickets' channel
    await pusherServer.trigger([ticketId, "tickets"], "tickets:closeBySupport", { id: ticketId } as ITicket)
  }

  return NextResponse.json({ message: "Ticket marked as completed (ticket closed)" }, { status: 200 })
}
