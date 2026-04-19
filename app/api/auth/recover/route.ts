import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { normalizeAuthEmail } from "@/utils/publicUserSync"
import { NextResponse } from "next/server"

export type TAPIAuthRecover = {
  email: string
}

export async function POST(req: Request) {
  const body: TAPIAuthRecover = await req.json()
  const normalizedEmail = normalizeAuthEmail(body.email)

  try {
    // Check is user with this email doesn't exist
    const { data: publicUsers, error: emailSelectError } = await supabaseAdmin
      .from("23_users")
      .select("email,email_confirmed_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
    const email = publicUsers?.[0]?.email

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
