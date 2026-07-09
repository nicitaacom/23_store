import { NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPITicketGetTicketIdRequest = {
  userId: string
}

export type TAPITicketGetTicketIdData = {
  ticket_id: string
}

export async function POST(req: Request) {
  const { userId } = (await req.json()) as TAPITicketGetTicketIdRequest

  const { data: ticket_id } = await supabaseAdmin
    .from("23_tickets")
    .select("id")
    .eq("owner_username", userId) // TODO - what? WTF? - like owner_username it's owner username but it's defenitely NOT userId
    // how to even supposed to work with anonymousId and userId - you should have separated logic for that or separated "tickets" tables in DB
    .eq("is_open", true)
    .single()
  if (!ticket_id) {
    return NextResponse.json("")
  }
  return NextResponse.json({ ticket_id: ticket_id.id } as TAPITicketGetTicketIdData)
}
