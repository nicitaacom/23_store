import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { AxiosResponse } from "axios"
import { NextResponse } from "next/server"

export type TAPITicketGetTicketIdRequest = {
  userId: string
}

export type Response = {
  ticket_id: string
}
export type TAPITicketGetTicketIdResponse = AxiosResponse<Response>

export async function POST(req: Request) {
  const { userId } = (await req.json()) as TAPITicketGetTicketIdRequest

  const { data: ticket_id } = await supabaseAdmin
    .from("tickets")
    .select("id")
    .eq("owner_username", userId) // TODO - what? WTF? - like owner_username it's owner username but it's defenitely NOT userId
    // how to even supposed to work with anonymousId and userId - you should have separated logic for that or separated "tickets" tables in DB
    .eq("is_open", true)
    .single()
  if (!ticket_id) {
    return NextResponse.json("")
  }
  return NextResponse.json(ticket_id.id as unknown as Response)
}
