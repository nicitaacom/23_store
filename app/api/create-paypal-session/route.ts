import { NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"
import { getURL } from "@/utils/helpers"

type stripeProductType = {
  price: string
  quantity: number
}

export type TPayPalProductsQuery = {
  payPalProductsQuery: string
}

export async function POST(request: Request) {
  const body: TPayPalProductsQuery = await request.json()

  const customer = await stripe.customers.create()

  //Decoding url to get json from this %7B%22price%22%3A%22price_1O8TYeDEq5VtEmnoi7r1D4Gs%22%2C%22quantity%22%3A1%7D
  const productsQuery = decodeURIComponent(body.payPalProductsQuery)

  //split & if query has multiple objects to get array from this
  //{"price":"price_1O8TYeDEq5VtEmnoi7r1D4Gs","quantity":1}&{"price":"price_1O7174DEq5VtEmno3dk9tomc","quantity":1}
  const productsStringArray = productsQuery.includes("&") ? productsQuery.split("&") : [productsQuery]

  //parsing string to convert string type to json type
  const productsJsonArray: stripeProductType[] = productsStringArray.map(product => JSON.parse(product))

  // const checkoutSession = await stripe.checkout.sessions.create({
  //   payment_method_types: ["paypal"],
  //   mode: "payment",
  //   customer: customer.id,
  //   success_url: `${getURL()}/payment/?status=success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${getURL()}/payment/?status=canceled`,
  // })

  // const session = await stripe.checkout.sessions.retrieve("{{SESSION_ID}}", {
  //   expand: ["setup_intent"],
  // })
  return NextResponse.json({ productsJsonArray }, { status: 200 })
}
