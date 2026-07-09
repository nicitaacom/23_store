import { NextResponse } from "next/server"

import { getURL } from "@/utils/helpers"
import { stripe } from "@/libs/stripe"

type StripeCheckoutLineItem = {
  imageUrl?: string | null
  name: string
  quantity: number
  unitAmount: number
}

export type TPayPalProductsQuery = {
  payPalProductsQuery: string
  email: string
}

export async function POST(req: Request) {
  const body: TPayPalProductsQuery = await req.json()

  const customer = await stripe.customers.create()

  const productsJsonArray = JSON.parse(decodeURIComponent(body.payPalProductsQuery)) as StripeCheckoutLineItem[]
  const line_items = productsJsonArray.map(product => ({
    price_data: {
      currency: "usd",
      product_data: {
        images: product.imageUrl ? [product.imageUrl] : undefined,
        name: product.name,
      },
      unit_amount: product.unitAmount,
    },
    quantity: product.quantity,
  }))

  // I used this strange guide on unknown language without way to change language
  // https://stripe.com/docs/payments/paypal/set-up-future-payments
  // But I decided to do it as in 'create-checkout-session' route but only with `payment_method_types` paypal
  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["paypal"],
    mode: "payment",
    customer: customer.id,
    line_items,
    success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getURL()}/payment/?status=canceled`,
  })

  if (checkoutSession.url) {
    return NextResponse.json(checkoutSession.url)
  } else {
    return new NextResponse("No session url - please check create-checkout-session route", { status: 500 })
  }
}
