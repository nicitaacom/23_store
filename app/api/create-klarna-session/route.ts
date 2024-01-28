import axios from "axios"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Replace 'YOUR_ACCESS_TOKEN_HERE' with the actual access token you obtain from Klarna

    const credentials = Buffer.from(`PK164506_a6b7069bd257:MlInBEst3WHu3tBb`, "utf-8").toString("base64")

    // Make a POST request to the Klarna Checkout API to create an order
    const klarnaResponse = await axios.post("https://api.klarna.com/payments/v1/authorizations/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
        // Add any other required headers
      },
      body: JSON.stringify({
        line_items: [],
        // Add the required parameters for creating a Klarna order
        // For example: customer details, line items, payment method types, etc.
      }),
    })

    // Attempt to parse the JSON response
  } catch (error) {
    if (error instanceof Error) {
      // Handle any error that occurred during the Klarna request
      console.error("Error occurred while processing Klarna request:", error.message)
      return new NextResponse("Error occurred while processing Klarna request", { status: 500 })
    }
  }
}
