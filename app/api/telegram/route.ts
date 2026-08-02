import { NextResponse } from "next/server"

import { sendTelegramMessage } from "@/utils/sendTelegramMessage"

export async function POST(req: Request) {
  const body: API.TelegramRequest = await req.json()
  const message = body.message
  //send message
  //use this guide to send file - https://youtu.be/RviYQrNdDok?list=LL&t=1687
  try {
    const response = await sendTelegramMessage(message)

    if (!response.ok)
      return NextResponse.json(
        {
          message: response.description || "Telegram API error",
          data: response.data,
          status: response.status,
          statusText: response.statusText || "Telegram API error",
        } as API.TelegramResponse,
        { status: response.status || 500 },
      )

    return NextResponse.json(
      {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      } as API.TelegramResponse,
      { status: 200 },
    )
  } catch (error) {
    console.error("Telegram route error:", error)
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
