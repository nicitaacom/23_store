import axios, { AxiosResponse } from "axios"
import { NextResponse } from "next/server"

type TCurrencyQuote = {
  id: number
  symbol: string
  name: string
  amount: number
  last_updated: string
  quote: {
    [currency: string]: {
      price: number
      last_updated: string
    }
  }
}

type TResponse = {
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
    elapsed: number
    credit_count: number
    notice: string | null
  }
  data: TCurrencyQuote[]
}

export type TAPICoinmarketcapResponse<T = any> = AxiosResponse<TResponse>

export async function POST(req: Request) {
  const body = await req.json()
  const amount = body.amount
  const symbol = body.symbol
  const convert = body.convert

  const response: TAPICoinmarketcapResponse = await axios.get(
    `https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${amount}&symbol=${symbol}&convert=${convert}&CMC_PRO_API_KEY=${process.env.NEXT_COINMARKETCAP_SECRET}`,
  )

  return NextResponse.json(response.data)
}
