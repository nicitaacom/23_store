import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { Database } from "@/ts/types_db"

// Route handlers read and update the same Supabase auth cookies as the browser session.
export async function supabaseRouteHandler() {
  const cookieStore = await cookies()

  return createRouteHandlerClient<Database>(
    { cookies: () => cookieStore as unknown as ReturnType<typeof cookies> },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
}
