import axios from "axios"
import { NextResponse } from "next/server"

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

    const response = await axios.post(URI_API, {
      chat_id: CHAT_ID,
      parse_mode: "html",
      text: message,
    })

    if (!response.data?.ok)
      return NextResponse.json(
        {
          message: response.data?.description || "Telegram API error",
          data: response.data,
          status: response.status,
          statusText: response.statusText,
        } as API.TelegramResponse,
        { status: response.status || 500 },
      )

    console.log(32, "response - ", response)

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
