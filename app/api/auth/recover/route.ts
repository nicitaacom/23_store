import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIAuthRecover = {
  email: string
}

export async function POST(req: Request) {
  const body: TAPIAuthRecover = await req.json()
  const requestUrl = new URL(req.url)

  try {
    // Check is user with this email doesn't exist
    const { data: email_response, error: emailSelectError } = await supabaseAdmin
      .from("users")
      .select("email,email_confirmed_at")
      .eq("email", body.email)
      .single()
    const email = email_response?.email

    if (!email) {
      throw new Error("User with this email doesn't exist")
    }
    if (emailSelectError) {
      console.log(22, "emailSelectError \n", emailSelectError)
      throw emailSelectError
    }

    return NextResponse.json({ status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
