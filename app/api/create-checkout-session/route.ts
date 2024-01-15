import { NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"
import { getURL } from "@/utils/helpers"

type stripeProductType = {
  price: string
  quantity: number
}

export async function POST(request: Request) {
  const body = (await request.json()) as { stripeProductsQuery: string }

  try {
    // Decoding url to get json from this %7B%22price%22%3A%22price_1O8TYeDEq5VtEmnoi7r1D4Gs%22%2C%22quantity%22%3A1%7D
    const productsQuery = decodeURIComponent(body.stripeProductsQuery)

    // split & if query has multiple objects to get array from this
    // {"price":"price_1O8TYeDEq5VtEmnoi7r1D4Gs","quantity":1}&{"price":"price_1O7174DEq5VtEmno3dk9tomc","quantity":1}
    const productsStringArray = productsQuery.includes("&") ? productsQuery.split("&") : [productsQuery]

    // Parsing string to convert string type to json type
    const productsJsonArray: stripeProductType[] = productsStringArray.map(product => JSON.parse(product))

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "required",
      line_items: productsJsonArray,
      mode: "payment",
      success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getURL()}payment/?status=canceled`,
      shipping_address_collection: {
        allowed_countries: ["DE"],
      },
    })

    if (session.url) {
      return NextResponse.json(decodeURIComponent(session.url))
    } else {
      return new NextResponse("No session url - please check create-checkout-session route", { status: 500 })
    }
  } catch (error) {
    return new NextResponse(`CREATE_CHECKOUT_SESSION ROUTE ERROR ${error}`, { status: 400 })
  }
}
