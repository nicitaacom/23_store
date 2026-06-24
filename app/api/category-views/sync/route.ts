import { NextResponse } from "next/server"

import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { isValidUUID } from "@/utils/isValidUUID"

const MAX_VIEWS_PER_CATEGORY = 1_000_000

export async function POST(req: Request) {
  const supabase = await supabaseServerAction()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: "Unauthorized" } satisfies API.CategoryViewsSyncResponse, { status: 401 })

  const body = (await req.json()) as API.CategoryViewsSyncRequest

  if (!body.views || typeof body.views !== "object" || Array.isArray(body.views))
    return NextResponse.json({ error: "views must be an object" } satisfies API.CategoryViewsSyncResponse, { status: 400 })

  const entries = Object.entries(body.views)

  if (entries.length > 500)
    return NextResponse.json(
      { error: "too many views entries (max 500)" } satisfies API.CategoryViewsSyncResponse,
      { status: 400 },
    )

  for (const [categoryId, count] of entries) {
    if (!isValidUUID(categoryId))
      return NextResponse.json(
        { error: `invalid category_id: ${categoryId}` } satisfies API.CategoryViewsSyncResponse,
        { status: 400 },
      )
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > MAX_VIEWS_PER_CATEGORY)
      return NextResponse.json(
        { error: `invalid count for ${categoryId}` } satisfies API.CategoryViewsSyncResponse,
        { status: 400 },
      )
  }

  const validEntries = entries.filter(([, count]) => (count as number) > 0)
  if (!validEntries.length)
    return NextResponse.json({ ok: true } satisfies API.CategoryViewsSyncResponse, { status: 200 })

  // Fetch existing DB counts for these categories
  const categoryIds = validEntries.map(([id]) => id)
  const { data: existingRows } = await supabase
    .from("23_category_views")
    .select("category_id, view_count")
    .eq("user_id", user.id)
    .in("category_id", categoryIds)

  const dbCountMap: Record<string, number> = {}
  for (const row of existingRows ?? []) dbCountMap[row.category_id] = row.view_count

  // Upsert, taking GREATEST(db, local) to prevent local stale data from regressing DB counts
  const upsertRows = validEntries.map(([categoryId, localCount]) => ({
    user_id: user.id,
    category_id: categoryId,
    view_count: Math.max(dbCountMap[categoryId] ?? 0, localCount as number),
    last_viewed_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("23_category_views")
    .upsert(upsertRows, { onConflict: "user_id,category_id" })

  if (error)
    return NextResponse.json({ error: error.message } satisfies API.CategoryViewsSyncResponse, { status: 500 })

  return NextResponse.json({ ok: true } satisfies API.CategoryViewsSyncResponse, { status: 200 })
}
