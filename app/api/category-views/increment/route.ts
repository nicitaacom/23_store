import { NextRequest, NextResponse } from "next/server"

import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { isValidUUID } from "@/utils/isValidUUID"

export async function POST(req: NextRequest) {
  const supabase = await supabaseServerAction()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: "Unauthorized" } satisfies API.CategoryViewsIncrementResponse, { status: 401 })

  const body = (await req.json()) as API.CategoryViewsIncrementRequest

  if (!isValidUUID(body.category_id))
    return NextResponse.json(
      { error: "category_id must be a valid UUID" } satisfies API.CategoryViewsIncrementResponse,
      { status: 400 },
    )

  const delta = typeof body.delta === "number" && body.delta >= 1 && body.delta <= 5 ? Math.round(body.delta) : 1

  const { error } = await supabase.rpc("increment_category_view", {
    p_user_id: user.id,
    p_category_id: body.category_id,
    p_delta: delta,
  })

  if (error)
    return NextResponse.json({ error: error.message } satisfies API.CategoryViewsIncrementResponse, { status: 500 })

  return NextResponse.json({ ok: true } satisfies API.CategoryViewsIncrementResponse, { status: 200 })
}
