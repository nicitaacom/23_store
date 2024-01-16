import { resend } from "@/libs/resend"
import { NextResponse } from "next/server"

export type TAPISendEmail = {
  from: string
  to: string
  subject: string
  html: string
}

export async function POST(req: Request) {
  const { from, to, subject, html } = (await req.json()) as TAPISendEmail

  try {
    const response = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    })

    console.log(22, "response - ", response)

    return NextResponse.json({ status: 200 })
  } catch (error) {
    if (error instanceof Error) {
      console.log(29, "SEND_EMAIL_ERROR\n  \n", error.message)
      return new NextResponse(`/api/send-email/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
}
