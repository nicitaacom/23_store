import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/ts/types_db"

// don't use supabase/ssr because it's buggy
const supabaseServerAction = async () => {
  const cookieStore = await cookies() // Next 16: cookies() is async
  return createServerActionClient<Database>({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  })
}

export default supabaseServerAction
