import { stripe } from "@/libs/stripe"
import supabaseServerAction from "@/libs/supabaseServerAction"
import axios from "axios"
import { NextResponse } from "next/server"

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
      //Create update on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { images: images })

      //TODO - update images in DB

      //Active product if it not active
      if (!productResponse.active) {
        await axios.put(
          `https://api.stripe.com/v1/products/${productResponse.id}`,
          {
            active: true,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
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
      if (!productResponse.active) {
        //Active product if it not active
        await axios.put(
          `https://api.stripe.com/v1/products/${productResponse.id}`,
          {
            active: true,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
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
        await axios.put(
          `https://api.stripe.com/v1/products/${productResponse.id}`,
          {
            active: true,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
      }
      return NextResponse.json(productResponse, { status: 200 })
    }

    /* UPDATE PRICE */
    if (price) {
      //Updating price on stripe its another process - first you archive this product
      //then you create new product with updated price - BS - lmao

      //Delete existing product
      await axios.post("/api/products/delete", { id: productId })

      //Create new product with updated price
      const { data: title_DB } = await supabaseServerAction().from("products").select("title").eq("id", productId)
      const productResponse = await axios.post(
        "https://api.stripe.com/v1/products",
        {
          name: title_DB,
          description: "to change product price",
          type: "good",
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      )
      const priceResponse = await axios.post(
        "https://api.stripe.com/v1/prices",
        {
          unit_amount: price * 100, // Convert to cents
          currency: "usd",
          product: productResponse.data.id,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      )
      console.log(132, "priceResponse - ", priceResponse)
      //Archive product
      if (productResponse.data.active) {
        await axios.put(
          `https://api.stripe.com/v1/products/${productResponse.data.id}`,
          {
            active: false,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_STRIPE_SECRET_KEY}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        )
      }
      console.log(147, "productResponse.data - ", productResponse.data)
      //Update on Stripe https://stripe.com/docs/api/products/update
      const priceUpdateResponse = await stripe.products.update(productId, {
        default_price: productResponse.data.default_price,
      })
      return NextResponse.json(priceUpdateResponse, { status: 200 })
    }
  } catch (error: any) {
    console.log(13, "UPDATE_PRODUCT_ERROR\n", error.response.data)
    return new NextResponse(`/api/products/update/route.ts error (check termianl) ${error.response.data}`, {
      status: 500,
    })
  }
}
