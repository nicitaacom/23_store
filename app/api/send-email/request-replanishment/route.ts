import { resend } from "@/libs/resend"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { NextResponse } from "next/server"

export type TAPISendEmailRequestReplanishment = {
  owner_id: string
  subject: string
  html: string
}

export async function POST(req: Request) {
  const { owner_id, subject, html } = (await req.json()) as TAPISendEmailRequestReplanishment

  try {
    const { data: owner_email_response } = await supabaseAdmin.from("users").select("email").eq("id", owner_id).single()

    if (owner_email_response?.email) {
      await resend.emails.send({
        from: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
        to: owner_email_response?.email,
        subject: subject,
        html: html,
      })
    } else {
      console.log(23, "Owner email not found")
      return new NextResponse(
        `Send email "request replanishment" error \n
                Path:/api/send-email/request-replanishment/route.ts \n
                Error message:\n Please make sure that owner_id exist`,
        { status: 400 },
      )
    }

    return NextResponse.json({ status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      console.log(29, "SEND_EMAIL_ERROR\n  \n", error.message)
      return new NextResponse(`/api/check/send-email/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
}
