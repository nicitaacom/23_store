import { NextResponse } from "next/server"

import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export async function POST(req: Request) {
  const body: API.TelegramRequest = await req.json()
  const message = body.message
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID
  const URI_API = `https://api.telegram.org/bot${TOKEN}/sendMessage`
  //send message
  //use this guide to send file - https://youtu.be/RviYQrNdDok?list=LL&t=1687
  try {
    if (!TOKEN) throw Error("No telegram token")
    if (!CHAT_ID) throw Error("No telegram chat id")

    const response = await fetch(URI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        parse_mode: "html",
        text: message,
      }),
    })

    const responseData = await response.json()

    if (!response.ok || !responseData?.ok)
      return NextResponse.json(
        {
          message: responseData?.description || (response.ok ? "Telegram API error" : await getResponseErrorMessage(response)),
          data: responseData,
          status: response.status,
          statusText: response.statusText || "Telegram API error",
        } as API.TelegramResponse,
        { status: response.status || 500 },
      )

    return NextResponse.json(
      {
        data: responseData,
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
