import { resend } from "@/libs/resend"
import { NextResponse } from "next/server"
import { ErrorResponse } from "resend"

export type TAPISendEmail = {
  from: string
  to: string
  subject: string
  html: string
}

export async function POST(req: Request) {
  const { from, to, subject, html } = (await req.json()) as TAPISendEmail
  try {
    const { error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    })
    if (error as ErrorResponse) {
      return new NextResponse(`/api/check/send-email/route.ts error \n ${error?.message}`, {
        status: 400,
      })
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
