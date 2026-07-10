import { NextResponse } from "next/server"

import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export async function POST() {
  try {
    // Replace 'YOUR_ACCESS_TOKEN_HERE' with the actual access token you obtain from Klarna

    const credentials = Buffer.from(`PK164506_a6b7069bd257:MlInBEst3WHu3tBb`, "utf-8").toString("base64")

    // Make a POST request to the Klarna Checkout API to create an order
    const klarnaResponse = await fetch("https://api.klarna.com/payments/v1/authorizations/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        line_items: [],
      }),
    })

    if (!klarnaResponse.ok) {
      return new NextResponse(await getResponseErrorMessage(klarnaResponse), { status: klarnaResponse.status })
    }

    return NextResponse.json(await klarnaResponse.json())
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error occurred while processing Klarna request:", error.message)
      return new NextResponse("Error occurred while processing Klarna request", { status: 500 })
    }
  }
}
