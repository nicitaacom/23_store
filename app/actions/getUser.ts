import { cache } from "react"
import { User } from "@supabase/supabase-js"

import supabaseServer from "@/libs/supabase/supabaseServer"

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
