import { stripe } from "@/libs/stripe"
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
      // Update image on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { images: images })

      //TODO - update images in DB

      //Active product if it not active
      if (!productResponse.active) {
        stripe.products.update(productId, { active: true })
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
        stripe.products.update(productId, { active: true })
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
        stripe.products.update(productId, { active: true })
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
          images: product.img_url,
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
  } catch (error: any) {
    // Best practice to throw error like this
    if (error instanceof Stripe.errors.StripeError) {
      console.log(84, "DELETE_FOOD_ERROR\n (stripe) \n ", error.message)
      return new NextResponse(`/api/food/delete/route.ts error (stripe) \n ${error.message}`, {
        status: 500,
      })
    }
    if (error instanceof AxiosError) {
      console.log(84, "DELETE_FOOD_ERROR (supabase) \n", error)
      return new NextResponse(`/api/food/delete/route.ts error \n ${error}`, {
        status: 500,
      })
    }
    if (error instanceof Error) {
      console.log(90, "DELETE_FOOD_ERROR\n (supabase) \n", error.message)
      return new NextResponse(`/api/food/delete/route.ts error \n ${error}`, {
        status: 500,
      })
    }
  }
}
