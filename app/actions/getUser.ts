import supabaseServer from "@/libs/supabase/supabaseServer"
import { User } from "@supabase/supabase-js"
import { cache } from "react"

export const getUser = cache(async (): Promise<User | null> => {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()
  return user
})
