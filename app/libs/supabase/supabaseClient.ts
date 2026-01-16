import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/TS/types_db"

const supabaseClient = createClientComponentClient<Database>()

export default supabaseClient
