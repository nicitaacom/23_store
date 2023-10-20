import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  const supabase = createRouteHandlerClient({ cookies })
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }
  const { data: user } = await supabase.auth.getUser()
  if (user && user.user) {
    //Insert row in users table
    const { error: error_insert_users } = await supabase.from("users").insert({
      id: user.user.id,
      username: user.user.user_metadata.name ?? user.user.user_metadata.username,
      email: user.user.user_metadata.email,
      profile_picture_url: user.user.user_metadata.picture,
    })
    //Insert row in users_cart table
    const { error: error_users_cart_insert } = await supabase
      .from("users_cart")
      .insert({ owner_username: user.user.user_metadata.name, id: user.user.id })
  }
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/client?userId=${user?.user?.id}&username=${user.user?.user_metadata.name}
    &email=${user.user?.user_metadata.email}&profile_picture_url=${user.user?.user_metadata.picture}`,
  )
}
