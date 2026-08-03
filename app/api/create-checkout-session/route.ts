import { NextResponse } from "next/server"

import { getURL } from "@/utils/helpers"
import { stripe } from "@/libs/stripe"

type StripeCheckoutLineItem = {
  imageUrl?: string | null
  name: string
  quantity: number
  unitAmount: number
}

export async function POST(request: Request) {
  const body = (await request.json()) as API.ProductsCreateCheckoutSessionRequest

  try {
    const productsJsonArray = JSON.parse(decodeURIComponent(body.stripeProductsQuery)) as StripeCheckoutLineItem[]
    const lineItems = productsJsonArray.map(product => ({
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

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "required",
      line_items: lineItems,
      mode: "payment",
      customer_email: body.email || undefined,
      success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getURL()}payment/?status=canceled`,
      shipping_address_collection: {
        allowed_countries: ["DE"],
      },
    })

    if (session.url)
      return NextResponse.json({ url: decodeURIComponent(session.url) } satisfies API.ProductsCreateCheckoutSessionResponse)

    return new NextResponse("No session url - please check create-checkout-session route", { status: 500 })
  } catch (error) {
    return new NextResponse(`CREATE_CHECKOUT_SESSION ROUTE ERROR ${error}`, { status: 400 })
  }
}
