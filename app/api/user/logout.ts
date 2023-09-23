import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
}
