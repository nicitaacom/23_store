import { stripe } from "@/libs/stripe"
import { STRIPE_MAX_PRODUCT_IMAGES } from "@/constants/uploadLimits"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { AxiosError } from "axios"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export type TUpdateProductRequest = {
  productId: string
  images?: string[]
  title?: string
  subTitle?: string
  price?: number
}

export async function POST(req: Request) {
  const body: TUpdateProductRequest = await req.json()

  const productId = body.productId
  const images = body.images
  const title = body.title
  const subTitle = body.subTitle
  const price = body.price

  try {
    /* UPDATE IMAGE */
    if (images) {
      const stripeImages = images.filter(Boolean).slice(0, STRIPE_MAX_PRODUCT_IMAGES)

      // Update image on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { images: stripeImages })

      //TODO - update images in DB

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }
      return NextResponse.json(productResponse, { status: 200 })
    }

    /* UPDATE TITLE */
    if (title) {
      //Create update on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { name: title })

      // Update title in DB
      const { error: update_title_error } = await supabaseServerAction()
        .from("products")
        .update({ title: title })
        .eq("id", productId)
      if (update_title_error)
        throw new Error(
          `update product title \n Path:/api/products/update/route.ts \n Error message:\n ${update_title_error.message}`,
        )

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }

      return NextResponse.json(productResponse, { status: 200 })
    }

    /* UPDATE DESCRIPTION */
    if (subTitle) {
      //Update on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { description: subTitle })
      const { error: update_description_error } = await supabaseServerAction()
        .from("products")
        .update({ sub_title: subTitle })
        .eq("id", productId)
      if (update_description_error)
        throw new Error(
          `update product sub_title \n Path:/api/products/update/route.ts \n Error message:\n ${update_description_error.message}`,
        )

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }
      return NextResponse.json(productResponse, { status: 200 })
    }

    /* UPDATE PRICE */
    if (price) {
      //Updating price on stripe its another process - first you archive this product
      //then you create new product with updated price - BS - lmao

      // Get data from DB to create new product on stripe
      const { data: product } = await supabaseServerAction().from("products").select("*").eq("id", productId).single()

      // Create new product on stripe
      if (product) {
        const productResponse = await stripe.products.create({
          name: product?.title,
          description: product?.sub_title,
          images: product.img_url?.slice(0, STRIPE_MAX_PRODUCT_IMAGES),
        })

        // Active product if it not active
        if (!productResponse.active) {
          await stripe.products.update(productResponse.id, { active: true })
        }

        // Create price for created product on stripe
        const priceResponse = await stripe.prices.create({
          product: productResponse.id,
          unit_amount: price * 100,
          currency: "usd",
        })

        // Archive current product on stripe
        await stripe.products.update(productId, { active: false })

        // Update id and price_id in DB to associate new product on stripe with product in DB
        await supabaseServerAction()
          .from("products")
          .update({ id: productResponse.id, price_id: priceResponse.id, price: price })
          .eq("id", productId)

        return NextResponse.json(productResponse, { status: 200 })
      } else {
        throw new Error(`Update price\n Product with id ${productId} not found in DB\n`)
      }
    }

    return NextResponse.json({ error: "No valid update payload provided" }, { status: 400 })
  } catch (error: any) {
    if (error instanceof Stripe.errors.StripeError) {
      console.log("PRODUCT_UPDATE_ERROR\n(stripe)\n", error.message)
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
    }
    if (error instanceof AxiosError) {
      const errorMessage =
        typeof error.response?.data === "string"
          ? error.response.data
          : typeof error.response?.data?.error === "string"
            ? error.response.data.error
            : error.message

      console.log("PRODUCT_UPDATE_ERROR\n(axios)\n", errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: error.response?.status || 500 })
    }
    if (error instanceof Error) {
      console.log("PRODUCT_UPDATE_ERROR\n(error)\n", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown product update error" }, { status: 500 })
  }
}
