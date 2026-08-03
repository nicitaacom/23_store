import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import { Database } from "@/ts/types_db"

const supabaseClient = createClientComponentClient<Database>({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

export default supabaseClient
