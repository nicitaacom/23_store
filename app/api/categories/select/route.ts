import { NextResponse } from "next/server"

import { selectDBCategories } from "./selectDBCategories"

export async function GET() {
  const result = await selectDBCategories()
  if (typeof result === "string")
    return NextResponse.json({ error: result } satisfies API.CategoriesSelectResponse, { status: 500 })
  return NextResponse.json({ categories: result } satisfies API.CategoriesSelectResponse, { status: 200 })
}
