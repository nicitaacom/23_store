import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

import { Database } from "@/ts/types_db"

// don't use supabase/ssr because it's buggy
const supabaseServer = async () => {
  const cookieStore = await cookies() // Next 16: cookies() is async
  return createServerComponentClient<Database>({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  })
}

export default supabaseServer
