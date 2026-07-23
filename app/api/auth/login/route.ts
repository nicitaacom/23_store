import { NextResponse } from "next/server"

import { normalizeAuthEmail } from "@/utils/publicUserSync"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPIAuthLogin = {
  email: string
}

export async function POST(req: Request) {
  const body: TAPIAuthLogin = await req.json()
  const requestUrl = new URL(req.url)
  const normalizedEmail = normalizeAuthEmail(body.email)

  try {
    // 1. Check is user with this email doesn't exist
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- This pre-authentication lookup is restricted to the normalized login email and non-sensitive confirmation fields.
    const { data: publicUsers, error: emailSelectError } = await supabaseAdmin
      .from("23_users")
      .select("email,email_confirmed_at,providers")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
    const email = publicUsers?.[0]?.email

    if (!email) {
      throw new Error("User with this email doesn't exist")
    }
    if (emailSelectError) {
      console.log(29, "emailSelectError \n", emailSelectError)
      throw emailSelectError
    }

    // 2. Resend email if user try to login with email that already exists but not confirmed
    if (!(publicUsers || []).some(user => user.email_confirmed_at)) {
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${requestUrl.origin}/auth/callback/credentials`,
        },
      })
      if (resendError) throw resendError
      throw new Error("User exists - check your email\n You might not verified your email")
    }

    // 3. Return info about providers to show error like 'You already have account with google - continue with google?'
    const providers = Array.from(new Set((publicUsers || []).flatMap(user => user.providers || [])))

    return NextResponse.json({ providers: providers })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
