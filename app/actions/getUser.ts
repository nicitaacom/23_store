import supabaseServer from "@/libs/supabase/supabaseServer"
import { User } from "@supabase/supabase-js"
import { cache } from "react"

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
