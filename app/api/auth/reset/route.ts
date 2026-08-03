import { NextResponse } from "next/server"

import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import supabaseServer from "@/libs/supabase/supabaseServer"

export type TAPIAuthReset = {
  email: string
  password: string
}

export async function POST(req: Request) {
  const body: TAPIAuthReset = await req.json()

  try {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.updateUser({ password: body.password })

    // 1. Change default supabase error.message to curstom error.message
    if (error) {
      if (error.message === "New password should be different from the old password.") {
        throw new Error("Its already your password - enter new one")
      }
      throw new Error(error.message)
    }

    // eslint-disable-next-line local-rules/use-rls-supabase-client -- 23_users has no UPDATE policy for this recovery marker; the authenticated reset succeeded above and service role clears only that user's flag.
    const { error: clearPublicMarkerError } = await supabaseAdmin
      .from("23_users")
      .update({ password_reset_required: false })
      .eq("id", data.user.id)
    if (clearPublicMarkerError) throw clearPublicMarkerError

    const { error: clearAuthMarkerError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        ...data.user.app_metadata,
        backup_password_reset_required: false,
      },
    })
    if (clearAuthMarkerError) console.error("Password changed but backup recovery marker cleanup failed", clearAuthMarkerError)

    // 2. Triger pusher for recover:completed event to show message like 'recover completed - thank you'
    await pusherServer.trigger(body.email, "recover:completed", null)

    return NextResponse.json({ user: data.user })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }
}
