import { createClient } from "@supabase/supabase-js"
// eslint-disable-next-line local-rules/no-banned-words -- Next.js API module path.
import { revalidateTag } from "next/cache"

import type { Database } from "@/ts/types_db"

const PUBLIC_CATALOG_TAG = "public-catalog"
const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300

export function createPublicCatalogClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, options) => fetch(input, {
        ...options,
        next: { revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS, tags: [PUBLIC_CATALOG_TAG] },
      }),
    },
  })
}

export function selectPublicCatalogCategories() {
  return createPublicCatalogClient()
    .from("23_categories")
    .select("id, name, parent_id")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true })
}

export function revalidatePublicCatalog() {
  revalidateTag(PUBLIC_CATALOG_TAG, { expire: 0 })
}
