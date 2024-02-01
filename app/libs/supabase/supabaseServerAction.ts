import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/interfaces/types_db"

const supabaseServerAction = () => {
  cookies().getAll() // Keep cookies in the JS execution context for Next.js build
  return createServerActionClient<Database>({ cookies })
}

export default supabaseServerAction
