import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Database } from "@/interfaces/types_db"

export const dynamic = "force-dynamic"

export async function PUT(req: Request) {
  const body = await req.json()
  const cart_quantity = body.cart_quantity
  const user_id = body.user_id

  const cookieStore = cookies()
  const supabaseRouteHandler = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  const { error: cart_quantity_error } = await supabaseRouteHandler
    .from("users_cart")
    .update({ cart_quantity: cart_quantity })
    .eq("id", user_id)
  if (cart_quantity_error) throw cart_quantity_error

  return NextResponse.json(cart_quantity_error)
}
