import { ICartQuantityResponse } from "@/(site)/components/Products"
import { Database } from "@/interfaces/types_db"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const user_id = body.user_id

  const cookieStore = cookies()
  const supabaseRouteHandler = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  const cart_quantity = await supabaseRouteHandler.from("users_cart").select("cart_quantity").eq("id", user_id).single()

  return NextResponse.json(cart_quantity as ICartQuantityResponse)
}
