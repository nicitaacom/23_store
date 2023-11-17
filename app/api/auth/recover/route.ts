import { pusherServer } from "@/libs/pusher"
import supabaseServer from "@/libs/supabaseServer"
import { NextResponse } from "next/server"

export type TAPIAuthRecover = {
  email: string
  password: string
}

export async function POST(req: Request) {
  const body: TAPIAuthRecover = await req.json()

  try {
    const { data, error } = await supabaseServer().auth.updateUser({ password: body.password })
    if (error) {
      if (error.message === "New password should be different from the old password.") {
        throw new Error("Its already your password - enter new one")
      }
      throw new Error(error.message)
    }

    pusherServer.trigger(body.email, "recover:completed", "")
    return NextResponse.json({ user: data.user })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
