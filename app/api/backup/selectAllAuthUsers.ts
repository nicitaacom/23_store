import type { User } from "@supabase/supabase-js"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

const AUTH_USERS_PAGE_SIZE = 1000

export async function selectAllAuthUsers(): Promise<User[]> {
  const users: User[] = []

  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: AUTH_USERS_PAGE_SIZE })
    if (error) throw error
    users.push(...data.users)
    if (!data.nextPage) break
  }

  return users
}
