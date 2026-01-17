import axios, { AxiosResponse } from "axios"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const amount = body.amount
  const symbol = body.symbol
  const convert = body.convert

  const response: API.CoinmarketcapResponse = await axios.get(
    `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${amount}&symbol=${symbol}&convert=${convert}&CMC_PRO_API_KEY=${process.env.NEXT_COINMARKETCAP_SECRET}`,
  )

  return NextResponse.json(response.data)
}
