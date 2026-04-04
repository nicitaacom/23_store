import { NextResponse } from "next/server"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export async function POST(req: Request) {
  const body = await req.json()
  const amount = body.amount
  const symbol = body.symbol
  const convert = body.convert

  const response = await fetch(
    `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${amount}&symbol=${symbol}&convert=${convert}&CMC_PRO_API_KEY=${process.env.NEXT_COINMARKETCAP_SECRET}`,
  )

  if (!response.ok) {
    return NextResponse.json({ error: await getResponseErrorMessage(response) }, { status: response.status })
  }

  return NextResponse.json((await response.json()) as API.CoinmarketcapResponse)
}
