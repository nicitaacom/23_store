import supabaseServerAction from "@/utils/supabaseServerAction"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }
  const { data: user } = await supabaseServerAction().auth.getUser()
  if (user && user.user) {
    //Insert row in users table
    const { error: errorUsersInsert } = await supabaseServerAction()
      .from("users")
      .insert({ id: user.user.id, username: user.user.user_metadata.name, email: user.user.user_metadata.email })
    if (errorUsersInsert) throw errorUsersInsert
    //Insert row in users_cart table
    const { error: errorUsersCartInsert } = await supabaseServerAction()
      .from("users_cart")
      .insert({ owner_username: user.user.user_metadata.name, id: user.user.id })
    if (errorUsersCartInsert) throw errorUsersCartInsert
  }
  return NextResponse.redirect(requestUrl.origin)
}
