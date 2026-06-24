import { NextResponse } from "next/server"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

export async function GET() {
  const supabase = await supabaseServerAction()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: "Unauthorized" } satisfies API.CategoryViewsSelectResponse, { status: 401 })

  const { data, error } = await supabase
    .from("23_category_views")
    .select("category_id, view_count, last_viewed_at")
    .eq("user_id", user.id)

  if (error)
    return NextResponse.json({ error: error.message } satisfies API.CategoryViewsSelectResponse, { status: 500 })

  return NextResponse.json(
    { views: data ?? [] } satisfies API.CategoryViewsSelectResponse,
    { status: 200 },
  )
}
