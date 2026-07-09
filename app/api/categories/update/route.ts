import { NextResponse } from "next/server"

import { updateDBCategory } from "./updateDBCategory"
import { isValidCategoryName } from "@/utils/categoryValidation"
import { isValidUUID } from "@/utils/isValidUUID"
import { requireAdmin } from "@/api/backup/requireAdmin"

export async function PATCH(req: Request) {
  const body = (await req.json()) as API.CategoriesUpdateRequest

  if (!isValidUUID(body.id))
    return NextResponse.json({ error: "id must be a valid UUID" } satisfies API.CategoriesUpdateResponse, { status: 400 })

  if (body.name !== undefined && !isValidCategoryName(body.name))
    return NextResponse.json(
      { error: "name invalid (2–255 chars, letters/numbers/spaces/apostrophes/hyphens/ampersands only)" } satisfies API.CategoriesUpdateResponse,
      { status: 400 },
    )

  if (body.parent_id !== undefined && body.parent_id !== null && !isValidUUID(body.parent_id))
    return NextResponse.json({ error: "parent_id must be a valid UUID" } satisfies API.CategoriesUpdateResponse, { status: 400 })

  if (body.parent_id === body.id)
    return NextResponse.json({ error: "category cannot be its own parent" } satisfies API.CategoriesUpdateResponse, { status: 400 })

  const adminError = await requireAdmin()
  if (adminError)
    return NextResponse.json({ error: adminError } satisfies API.CategoriesUpdateResponse, { status: adminError === "Unauthorized" ? 401 : 403 })

  const result = await updateDBCategory(body.id, body.name, body.parent_id)
  if (typeof result === "string")
    return NextResponse.json({ error: result } satisfies API.CategoriesUpdateResponse, { status: 500 })

  return NextResponse.json({ category: result } satisfies API.CategoriesUpdateResponse, { status: 200 })
}
