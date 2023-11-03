import { Database } from "@/interfaces/types_db"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  const supabase = createRouteHandlerClient({ cookies: cookies })
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const { data: user } = await supabase.auth.getUser()
  if (user && user.user) {
    //Insert row in users table
    const { error: error_insert_users } = await supabaseAdmin.from("users").insert({
      id: user.user.id,
      username: user.user.user_metadata.name ?? user.user.user_metadata.username,
      email: user.user.user_metadata.email,
      profile_picture_url: user.user.user_metadata.picture,
    })
    if (error_insert_users) {
      //if username already exists - rename username
      const { error: error_insert_users_attempt2 } = await supabaseAdmin.from("users").insert({
        id: user.user.id,
        username: `renamedUser_${crypto.randomUUID()}`,
        email: user.user.user_metadata.email,
        profile_picture_url: user.user.user_metadata.picture,
      })
    }
    //Insert row in users_cart table
    const { error: error_users_cart_insert } = await supabaseAdmin.from("users_cart").insert({ id: user.user.id })
  }
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/client?userId=${user?.user?.id}&username=${user.user?.user_metadata.name}
    &email=${user.user?.user_metadata.email}&profile_picture_url=${user.user?.user_metadata.picture}`,
  )
}
