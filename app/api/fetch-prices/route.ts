import { NextRequest, NextResponse } from "next/server"
import { getRealisticPrice } from "./fetchPrices"

export async function POST(req: NextRequest) {
  const { title, subTitle } = await req.json()
  const priceData = await getRealisticPrice(title, subTitle)
  return NextResponse.json(priceData)
}
