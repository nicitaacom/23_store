import { cookies } from "next/headers"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"

import { Database } from "@/ts/types_db"

// don't use supabase/ssr because it's buggy
async function supabaseServerAction() {
  const cookieStore = await cookies() // Next 16: cookies() is async
  return createServerActionClient<Database>(
    { cookies: () => cookieStore as unknown as ReturnType<typeof cookies> },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
}

export default supabaseServerAction
