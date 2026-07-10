import { NextResponse } from "next/server"

import { deleteDBCategory } from "./deleteDBCategory"
import { isValidUUID } from "@/utils/isValidUUID"
import { requireAdmin } from "@/api/backup/requireAdmin"

export async function DELETE(req: Request) {
  const body = (await req.json()) as API.CategoriesDeleteRequest

  if (!isValidUUID(body.id))
    return NextResponse.json({ error: "id must be a valid UUID" } satisfies API.CategoriesDeleteResponse, { status: 400 })

  const adminError = await requireAdmin()
  if (adminError)
    return NextResponse.json({ error: adminError } satisfies API.CategoriesDeleteResponse, { status: adminError === "Unauthorized" ? 401 : 403 })

  const response = await deleteDBCategory(body.id)
  if (typeof response === "string")
    return NextResponse.json({ error: response } satisfies API.CategoriesDeleteResponse, { status: 500 })

  return NextResponse.json({ ok: true } satisfies API.CategoriesDeleteResponse, { status: 200 })
}
