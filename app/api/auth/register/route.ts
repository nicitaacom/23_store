import { NextResponse } from "next/server"

import { getURL } from "@/utils/helpers"

import list from "disposable-email-domains"
import supabaseAdmin from "@/libs/supabaseAdmin"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export type TAPIAuthRegister = {
  username: string
  email: string
  password: string
}

export async function POST(req: Request) {
  const { username, email, password }: TAPIAuthRegister = await req.json()
  const supabase = createRouteHandlerClient({ cookies })

  //basic check for temp-emails
  async function isDisposable(email: string) {
    return list.includes(email.split("@")[1])
  }

  try {
    if (await isDisposable(email)) {
      throw new Error(`It seems like you use temp-mail - please use actuall email\n
    So you can recover your password and get access to support`)
    }

    // Check if user with this email already exists with verified email
    const { data: email_response } = await supabaseAdmin
      .from("users")
      .select("email,email_confirmed_at")
      .eq("email", email)
      .single()
    if (email_response?.email === email && email_response.email_confirmed_at) {
      throw new Error("User with this email already exists")
    }
    // Resend email if user try to register email that already exists but not confirmed
    if (email_response?.email === email && !email_response.email_confirmed_at) {
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${getURL()}auth/callback/credentials`,
        },
      })
      if (resendError) throw resendError
      throw new Error("User exists - check your email\n You might not verified your email")
    }

    /* Insert row in 'users' table for a new user */
    //Sign up to add row in 'auth.users' and get verification email
    const { data: user, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: `${getURL()}auth/callback/credentials`,
      },
    })
    if (signUpError) {
      console.log(`api/auth/register/route.ts ${signUpError}`)
      throw new Error(`${signUpError}`)
    }
    // Insert row in 'public.users' table (if user exist throw error)
    // Don't insert provider ['credentials'] on this step because supabase delete 'enctypted_password'
    // from 'auth.users' if you not verify your email and login with oauth
    // (without 'encrypted_password' supabase don't let you login)
    if (user && user.user?.id) {
      await supabaseAdmin.from("users").insert({ id: user.user.id, username: username, email: email })
      await supabaseAdmin.from("users_cart").insert({ id: user.user.id })
    }

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
