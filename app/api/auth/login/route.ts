import supabaseAdmin from "@/libs/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPIAuthLogin = {
  email: string
}

export async function POST(req: Request) {
  const body: TAPIAuthLogin = await req.json()

  try {
    // Check is user with this email exist
    const { data: email_response, error: emailSelectError } = await supabaseAdmin
      .from("users")
      .select("email")
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

    // Return info about providers to show error like 'You already have account with google - continue with google?'
    const { data: provider_response } = await supabaseAdmin
      .from("users")
      .select("providers")
      .eq("email", body.email)
      .single()
    const providers = provider_response?.providers

    return NextResponse.json({ providers: providers })
  } catch (error: any) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
