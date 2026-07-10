import { NextResponse } from "next/server"

import { insertDBCategory } from "./insertDBCategory"
import { isValidCategoryName } from "@/utils/categoryValidation"
import { isValidUUID } from "@/utils/isValidUUID"
import { requireAdmin } from "@/api/backup/requireAdmin"

export async function POST(req: Request) {
  const body = (await req.json()) as API.CategoriesInsertRequest

  if (!isValidCategoryName(body.name))
    return NextResponse.json(
      { error: "name missing or invalid (2–255 chars, letters/numbers/spaces/apostrophes/hyphens/ampersands only)" } satisfies API.CategoriesInsertResponse,
      { status: 400 },
    )

  if (body.parent_id !== undefined && body.parent_id !== null && !isValidUUID(body.parent_id))
    return NextResponse.json(
      { error: "parent_id must be a valid UUID" } satisfies API.CategoriesInsertResponse,
      { status: 400 },
    )

  const adminError = await requireAdmin()
  if (adminError)
    return NextResponse.json({ error: adminError } satisfies API.CategoriesInsertResponse, { status: adminError === "Unauthorized" ? 401 : 403 })

  const response = await insertDBCategory(body.name, body.parent_id ?? null)
  if (typeof response === "string")
    return NextResponse.json({ error: response } satisfies API.CategoriesInsertResponse, { status: 500 })

  return NextResponse.json({ category: response } satisfies API.CategoriesInsertResponse, { status: 201 })
}
