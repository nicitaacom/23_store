import { NextResponse } from "next/server"
import { ErrorResponse } from "resend"

import { resend } from "@/libs/resend"

export type TAPISendEmail = {
  from: string
  to: string
  subject: string
  html: string
}

export async function POST(req: Request) {
  const { from, to, subject, html } = (await req.json()) as TAPISendEmail
  try {
    const { data, error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    })
    if (error as ErrorResponse) {
      console.log(23, "SEND_EMAIL_ERROR", { from, to, subject }, error)
      return new NextResponse(`/api/send-email/route.ts error \n ${error?.message}`, {
        status: 400,
      })
    }

    console.log(29, "SEND_EMAIL_OK", { resendId: data?.id, from, to, subject })
    return NextResponse.json({ status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      console.log(33, "SEND_EMAIL_ERROR\n  \n", error.message)
      return new NextResponse(`/api/send-email/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
}
