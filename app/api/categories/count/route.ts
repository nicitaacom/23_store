import { NextResponse } from "next/server"

import { isValidUUID } from "@/utils/isValidUUID"
import { requireAdmin } from "@/api/backup/requireAdmin"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!isValidUUID(id))
    return NextResponse.json({ error: "id must be a valid UUID" } satisfies API.CategoriesCountResponse, { status: 400 })

  const adminError = await requireAdmin()
  if (adminError)
    return NextResponse.json({ error: adminError } satisfies API.CategoriesCountResponse, { status: adminError === "Unauthorized" ? 401 : 403 })

  const supabase = await supabaseServerAction()

  // Count products directly assigned to this category + all its children
  const { data: children } = await supabase.from("23_categories").select("id").eq("parent_id", id)
  const childIds = (children ?? []).map(c => c.id)
  const categoryIds = [id, ...childIds]

  const { count, error } = await supabase
    .from("23_products")
    .select("*", { count: "exact", head: true })
    .in("category_id", categoryIds)

  if (error)
    return NextResponse.json({ error: error.message } satisfies API.CategoriesCountResponse, { status: 500 })

  return NextResponse.json({ count: count ?? 0 } satisfies API.CategoriesCountResponse, { status: 200 })
}
