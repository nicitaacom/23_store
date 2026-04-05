import { NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"
import { getURL } from "@/utils/helpers"

type StripeCheckoutLineItem = {
  imageUrl?: string | null
  name: string
  quantity: number
  unitAmount: number
}

export async function POST(request: Request) {
  const body = (await request.json()) as { stripeProductsQuery: string; email: string | undefined }

  try {
    const productsJsonArray = JSON.parse(decodeURIComponent(body.stripeProductsQuery)) as StripeCheckoutLineItem[]
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

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "required",
      line_items,
      mode: "payment",
      customer_email: body.email,
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
