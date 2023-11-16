import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIAuthRegister = {
  id: string
  username: string
  email: string
}

export async function POST(req: Request) {
  const body: TAPIAuthRegister = await req.json()

  const { data: insertInUsers, error: insertInUsersError } = await supabaseAdmin
    .from("users")
    .insert({ id: body.id, username: body.username, email: body.email })
  console.log(13, "insertInUsers - ", insertInUsers)
  console.log(14, "insertInUsersError - ", insertInUsersError)
  const { data: insertInUsersCart, error: insertInUsersCartError } = await supabaseAdmin
    .from("users_cart")
    .insert({ id: body.id })
  console.log(13, "insertInUsersCart - ", insertInUsersCart)
  console.log(14, "insertInUsersCartError - ", insertInUsersCartError)

  return NextResponse.json({ insertInUsersCart })
}
