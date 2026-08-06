import { NextResponse } from "next/server"
import Stripe from "stripe"

import { stripe } from "@/libs/stripe"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"
import { MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const title = String(body.title ?? "").trim()
  const description = String(body.description ?? "").trim()
  const price = Number(body.price)

  try {
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (title.length < MIN_PRODUCT_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title is too short - minimum ${MIN_PRODUCT_TITLE_LENGTH} characters` }, { status: 400 })
    }

    if (title.length > MAX_PRODUCT_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title is too long - maximum ${MAX_PRODUCT_TITLE_LENGTH} characters` }, { status: 400 })
    }

    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: "Price must be a positive integer amount in cents" }, { status: 400 })
    }

    // No images yet, on purpose: the productId this call returns is the Storage folder they upload
    // into, so they exist only after it. /api/products/update puts them on the product right after.
    const productResponse = await stripe.products.create({
      name: title,
      ...(description ? { description } : {}),
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
