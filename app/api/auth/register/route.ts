import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import list from "disposable-email-domains"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { normalizeAuthEmail, syncPublicUserRecord } from "@/utils/publicUserSync"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export type TAPIAuthRegister = {
  username: string
  email: string
  password: string
}

export async function POST(req: Request) {
  const { username, email, password }: TAPIAuthRegister = await req.json()
  const supabase = createRouteHandlerClient({ cookies })
  const requestUrl = new URL(req.url)
  const normalizedEmail = normalizeAuthEmail(email)

  // 1. Basic check for temp-emails (if temp-email - throw error)
  async function isDisposable(email: string) {
    return list.includes(email.split("@")[1])
  }

  try {
    if (await isDisposable(normalizedEmail)) {
      throw new Error(`It seems like you use temp-mail - please use actuall email\n
    So you can recover your password and get access to support`)
    }

    // 2. Check if user with this email already exists with verified email
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- This pre-authentication lookup is restricted to the validated registration email and confirmation state.
    const { data: existingUsers, error: selectUsersError } = await supabaseAdmin
      .from("23_users")
      .select("email,email_confirmed_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })

    if (selectUsersError) throw selectUsersError

    const hasConfirmedUser = (existingUsers || []).some(user => user.email_confirmed_at)
    if (hasConfirmedUser) {
      throw new Error("User with this email already exists")
    }
    // 3. Resend email if user try to register email that already exists but not confirmed
    if ((existingUsers || []).length > 0) {
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${requestUrl.origin}/auth/callback/credentials`,
        },
      })
      if (resendError) throw resendError
      throw new Error("User exists - check your email\n You might not verified your email")
    }

    /* Insert row in 'users' table for a new user */
    // 4. Sign up to add row in 'auth.users' and get verification email
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        emailRedirectTo: `${requestUrl.origin}/auth/callback/credentials`,
        data: { username: username },
      },
    })
    if (signUpError) {
      console.log(`api/auth/register/route.ts ${signUpError}`)
      throw new Error(`${signUpError}`)
    }
    // 5. Insert row in 'public.users' 'public.users_cart' tables (if user exist throw error)
    // Don't insert provider ['credentials'] on this step because supabase delete 'enctypted_password'
    // from 'auth.users' if you not verify your email and login with oauth
    // (without 'encrypted_password' supabase don't let you login)
    if (user && user.user?.id) {
      await syncPublicUserRecord(user.user)
    } else {
      throw new Error("After signUp - user doesn't exist - try again")
    }

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
