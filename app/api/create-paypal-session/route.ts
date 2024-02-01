import { NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"
import { getURL } from "@/utils/helpers"

type stripeProductType = {
  price: string
  quantity: number
}

export type TPayPalProductsQuery = {
  payPalProductsQuery: string
  email: string
}

export async function POST(req: Request) {
  const body: TPayPalProductsQuery = await req.json()

  const customer = await stripe.customers.create()

  //Decoding url to get json from this %7B%22price%22%3A%22price_1O8TYeDEq5VtEmnoi7r1D4Gs%22%2C%22quantity%22%3A1%7D
  const productsQuery = decodeURIComponent(body.payPalProductsQuery)

  //split & if query has multiple objects to get array from this
  //{"price":"price_1O8TYeDEq5VtEmnoi7r1D4Gs","quantity":1}&{"price":"price_1O7174DEq5VtEmno3dk9tomc","quantity":1}
  const productsStringArray = productsQuery.includes("&") ? productsQuery.split("&") : [productsQuery]

  //parsing string to convert string type to json type
  const productsJsonArray: stripeProductType[] = productsStringArray.map(product => JSON.parse(product))

  // I used this strange guide on unknown language without way to change language
  // https://stripe.com/docs/payments/paypal/set-up-future-payments
  // But I decided to do it as in 'create-checkout-session' route but only with `payment_method_types` paypal
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["paypal"],
    mode: "payment",
    customer: customer.id,
    line_items: productsJsonArray,
    success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getURL()}/payment/?status=canceled`,
  })

  if (checkoutSession.url) {
    return NextResponse.json(checkoutSession.url)
  } else {
    return new NextResponse("No session url - please check create-checkout-session route", { status: 500 })
  }
}
