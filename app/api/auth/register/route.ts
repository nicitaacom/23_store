import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIAuthRegister = {
  id: string
}

export async function POST(req: Request) {
  const body: TAPIAuthRegister = await req.json()

  const { data, error } = await supabaseAdmin.from("users_cart").insert({ id: body.id })

  console.log(13, "data - ", data)
  console.log(14, "error - ", error)

  return NextResponse.json({ data })
}
