import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

// Verifies the caller is a logged-in ADMIN. Returns a string error on failure, otherwise null.
export async function requireAdmin(): Promise<string | null> {
  const supabase = await supabaseServerAction()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return "Unauthorized"

  const { data: userRow, error } = await supabase.from("23_users").select("role").eq("id", user.id).maybeSingle()
  if (error) return error.message
  if (userRow?.role !== "ADMIN") return "Forbidden: admin only"

  return null
}
