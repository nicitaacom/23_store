import { NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

/**
 * If userId set - route returns messages from open ticket for userId
 */

export async function POST(req: Request) {
  const { ticketId, userId } = (await req.json()) as {
    ticketId?: string
    userId?: string
  }

  if (!ticketId && !userId) {
    throw new Error("Either ticketId or userId must be set")
  }

  let ticketIdResponse: string | undefined = ticketId

  if (userId) {
    const { data: ticketId } = await supabaseAdmin
      .from("23_tickets")
      .select("id")
      .eq("owner_id", userId)
      .eq("is_open", true)
      .single()
    ticketIdResponse = ticketId?.id
  }
  if (!ticketIdResponse) {
    return NextResponse.json([])
  }

  const { data: messages_by_id_response, error: messages_by_id_error } = await supabaseAdmin
    .from("23_messages")
    .select("*")
    .eq("ticket_id", ticketIdResponse)
    .order("created_at", { ascending: true })
  if (messages_by_id_error) {
    console.log(25, "GET_MESSAGES_BY_TICKETID_ERROR")
    return new NextResponse(
      `Delete images from bucket \n
       Path:/api/products/delete/route.ts \n
       Error message:\n ${messages_by_id_error.message}`,
      { status: 400 },
    )
  }

  return NextResponse.json(messages_by_id_response)
}
