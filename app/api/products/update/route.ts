import { stripe } from "@/libs/stripe"
import { STRIPE_MAX_PRODUCT_IMAGES } from "@/constants/uploadLimits"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { normalizeProductVariants } from "@/utils/productVariants"
import { AxiosError } from "axios"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export type TUpdateProductRequest = {
  productId: string
  images?: string[]
  title?: string
  subTitle?: string
  price?: number
  onStock?: number
  variants?: TProductVariant[] | null
}

export async function POST(req: Request) {
  const body: TUpdateProductRequest = await req.json()

  const supabase = supabaseServerAction()
  const productId = body.productId
  const images = body.images
  const title = body.title
  const subTitle = body.subTitle
  const price = body.price
  const onStock = body.onStock
  const variants = body.variants

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: existingProduct, error: existingProductError } = await supabase.from("products").select("*").eq("id", productId).single()

    if (existingProductError || !existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (existingProduct.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* UPDATE IMAGE */
    if (images) {
      const stripeImages = images.filter(Boolean).slice(0, STRIPE_MAX_PRODUCT_IMAGES)

      // Update image on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { images: stripeImages })

      const { error: updateImagesError } = await supabase.from("products").update({ img_url: images }).eq("id", productId)
      if (updateImagesError)
        throw new Error(`update product images \n Path:/api/products/update/route.ts \n Error message:\n ${updateImagesError.message}`)

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }
      return NextResponse.json(productResponse, { status: 200 })
    }

    /* UPDATE TITLE */
    if (typeof title === "string") {
      //Create update on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { name: title })

      // Update title in DB
      const { error: update_title_error } = await supabase
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
    if (typeof subTitle === "string") {
      //Update on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { description: subTitle })
      const { error: update_description_error } = await supabase
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

    /* UPDATE VARIANTS */
    if (variants !== undefined) {
      const normalizedVariants = normalizeProductVariants(variants)
      const { error: updateVariantsError } = await supabase.from("products").update({ variants: normalizedVariants }).eq("id", productId)

      if (updateVariantsError)
        throw new Error(`update product variants \n Path:/api/products/update/route.ts \n Error message:\n ${updateVariantsError.message}`)

      return NextResponse.json({ success: true, variants: normalizedVariants }, { status: 200 })
    }

    /* UPDATE ON STOCK */
    if (typeof onStock === "number") {
      const { error: updateOnStockError } = await supabase.from("products").update({ on_stock: onStock }).eq("id", productId)

      if (updateOnStockError)
        throw new Error(`update product on_stock \n Path:/api/products/update/route.ts \n Error message:\n ${updateOnStockError.message}`)

      return NextResponse.json({ success: true, onStock }, { status: 200 })
    }

    /* UPDATE PRICE */
    if (typeof price === "number") {
      //Updating price on stripe its another process - first you archive this product
      //then you create new product with updated price - BS - lmao

      // Create new product on stripe
      if (existingProduct) {
        const productResponse = await stripe.products.create({
          name: existingProduct.title,
          description: existingProduct.sub_title,
          images: existingProduct.img_url?.slice(0, STRIPE_MAX_PRODUCT_IMAGES),
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
        await supabase
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
