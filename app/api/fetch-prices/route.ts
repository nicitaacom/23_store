import { NextRequest, NextResponse } from "next/server"
import { getRealisticPrice } from "./fetchPrices"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const title = body.title
  const description = body.description ?? body.subTitle
  const priceData = await getRealisticPrice(title, description)
  return NextResponse.json(priceData)
}
