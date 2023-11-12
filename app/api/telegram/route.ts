import axios from "axios"
import { NextResponse } from "next/server"

export type TAPITelegram = {
  message: string
}

export async function POST(req: Request) {
  const body: TAPITelegram = await req.json()
  const message = body.message
  const TOKEN = process.env.NEXT_TELEGRAM_BOT_TOKEN
  const CHAT_ID = process.env.NEXT_TELEGRAM_CHAT_ID
  const URI_API = `https://api.telegram.org/bot${TOKEN}/sendMessage`
  //send message
  //use this guide to send file - https://youtu.be/RviYQrNdDok?list=LL&t=1687
  try {
    const response = await axios.post(URI_API, {
      chat_id: CHAT_ID,
      parse_mode: "html",
      text: message,
    })

    return NextResponse.json({
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    })
  } catch (error) {
    console.error("Error sending message:\n", error)
    return NextResponse.error()
  }
}
