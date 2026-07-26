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

  // `owner_id` is the id a ticket is opened with (api/tickets/open) - `owner_username` is the display
  // name, so matching it against a user id never found the open ticket and every visit started a new one.
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- The support identity scopes this legacy anonymous-ticket lookup to one open ticket.
  const { data: ticket_id } = await supabaseAdmin
    .from("23_tickets")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_open", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!ticket_id) {
    return NextResponse.json("")
  }
  return NextResponse.json({ ticket_id: ticket_id.id } as TAPITicketGetTicketIdData)
}
