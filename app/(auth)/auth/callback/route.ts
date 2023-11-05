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

  const {
    data: { user: user },
  } = await supabase.auth.getUser()
  await supabaseAdmin.from("users_cart").insert({ id: user?.id })

  return NextResponse.redirect(
    `${requestUrl.origin}/auth/client?userId=${user?.id}&username=${user?.user_metadata.name}
    &email=${user?.user_metadata.email}&profile_picture_url=${user?.user_metadata.picture}`,
  )
}
