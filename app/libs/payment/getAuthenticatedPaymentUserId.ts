import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

/** Resolve the account from Supabase's verified session; checkout body fields are never used for identity. */
export async function getAuthenticatedPaymentUserId() {
  const supabase = await supabaseRouteHandler()
  const { data, error } = await supabase.auth.getUser()

  if (error?.name === "AuthSessionMissingError") return null
  if (error) throw error

  return data.user?.id ?? null
}
