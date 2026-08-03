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
  const body = (await request.json()) as API.ProductsCreatePayPalSessionRequest

  try {
    const customer = await stripe.customers.create({ email: body.email || undefined })
    const productsJsonArray = JSON.parse(decodeURIComponent(body.payPalProductsQuery)) as StripeCheckoutLineItem[]
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

    // I used this strange guide on unknown language without way to change language
    // https://stripe.com/docs/payments/paypal/set-up-future-payments
    // But I decided to do it as in 'create-checkout-session' route but only with `payment_method_types` paypal
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["paypal"],
      mode: "payment",
      customer: customer.id,
      line_items: lineItems,
      success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getURL()}/payment/?status=canceled`,
    })

    if (checkoutSession.url)
      return NextResponse.json({ url: checkoutSession.url } satisfies API.ProductsCreatePayPalSessionResponse)

    return new NextResponse("No session url - please check create-checkout-session route", { status: 500 })
  } catch (error) {
    return new NextResponse(`CREATE_PAYPAL_SESSION ROUTE ERROR ${error}`, { status: 400 })
  }
}
