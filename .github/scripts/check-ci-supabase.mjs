import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error("CI Supabase URL or service-role key is missing")

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

for (const table of ["23_users", "23_users_cart", "23_products", "23_buying_flow_events", "utm_stats"]) {
  const { error } = await supabase.from(table).select("id", { head: true }).limit(1)
  if (error) {
    throw new Error(
      `CI Supabase check failed for ${table} at ${new URL(supabaseUrl).host}: ${error.message}. ` +
      "Check that the GitHub Actions Supabase URL and service-role key point to the store database and its tables are present.",
    )
  }
}

console.log("CI Supabase tables are available")
