import { NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPITicketsRate = {
  ticketId: string
  rate: number
}

export async function POST(req: Request) {
  const { ticketId, rate } = (await req.json()) as TAPITicketsRate

  // Update is_open:false and rate:rate in 'tickets'
  const { error } = await supabaseAdmin.from("tickets").update({ is_open: false, rate: rate }).eq("id", ticketId)
  if (error) return NextResponse.json({ error: `Error in api/tickets/route.ts\n ${error.message}` }, { status: 400 })

  return NextResponse.json({ message: "Ticket marked as completed (ticket closed)" }, { status: 200 })
}
