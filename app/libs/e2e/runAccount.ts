import "server-only"
import { NextResponse } from "next/server"
import { createClient, type User } from "@supabase/supabase-js"

export async function getRunOwnedUser(request: Request, runId: unknown): Promise<{ user: User } | { response: NextResponse }> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || typeof runId !== "string" || !runId) {
    return { response: NextResponse.json({ error: "A signed-in run account is required." }, { status: 401 }) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return { response: NextResponse.json({ error: "The account service is unavailable." }, { status: 503 }) }
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { response: NextResponse.json({ error: "The run account session is invalid." }, { status: 401 }) }
  }
  if (data.user.app_metadata?.e2e_suite !== "23-store" || data.user.app_metadata?.e2e_run_id !== runId) {
    return { response: NextResponse.json({ error: "This account is not part of the requested test run." }, { status: 403 }) }
  }
  return { user: data.user }
}
