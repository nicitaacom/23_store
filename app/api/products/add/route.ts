import { stripe } from "@/libs/stripe"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.json()

  const title = String(body.title ?? "").trim()
  const subTitle = String(body.subTitle ?? "")
  const price = Number(body.price)

  try {
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: "Price must be a positive integer amount in cents" }, { status: 400 })
    }

    const productResponse = await stripe.products.create({
      name: title,
      description: subTitle,
      active: true,
    })

    const priceResponse = await stripe.prices.create({
      product: productResponse.id,
      unit_amount: price,
      currency: "usd",
    })

    return NextResponse.json(
      {
        id: priceResponse.id,
        product: productResponse.id,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.log("CREATE_PRODUCT_ERROR (stripe)\n", error.message)
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log("CREATE_PRODUCT_ERROR\n", errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
