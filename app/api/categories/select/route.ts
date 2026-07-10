import { NextResponse } from "next/server"

import { selectDBCategories } from "./selectDBCategories"

export async function GET() {
  const selectDBCategoriesResp = await selectDBCategories()
  if (typeof selectDBCategoriesResp === "string")
    return NextResponse.json({ error: selectDBCategoriesResp } satisfies API.CategoriesSelectResponse, { status: 500 })
  return NextResponse.json({ categories: selectDBCategoriesResp } satisfies API.CategoriesSelectResponse, { status: 200 })
}
