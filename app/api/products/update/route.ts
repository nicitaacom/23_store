import { stripe } from "@/libs/stripe"
import { STRIPE_MAX_PRODUCT_IMAGES } from "@/constants/uploadLimits"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { normalizeProductImageUrls } from "@/utils/product"
import { normalizeProduct, normalizeProductVariants } from "@/utils/productVariants"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export type TUpdateProductRequest = {
  productId: string
  images?: string[]
  translations?: ProductTranslations
  price?: number
  onStock?: number
  variants?: TProductVariant[] | null
}

export async function POST(req: Request) {
  const body: TUpdateProductRequest = await req.json()

  const supabase = supabaseServerAction()
  const productId = body.productId
  const images = body.images
  const translations = body.translations
  const price = body.price
  const onStock = body.onStock
  const variants = body.variants
  const getStripeDescriptionPayload = (description: string | undefined) => {
    const trimmedDescription = description?.trim()
    return trimmedDescription ? { description: trimmedDescription } : {}
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    async function getUpdatedProductResponse(updatedProductId: string) {
      const { data: updatedProduct, error: updatedProductError } = await supabase
        .from("products")
        .select("*")
        .eq("id", updatedProductId)
        .single()

      if (updatedProductError || !updatedProduct) {
        throw new Error(`Updated product not found for id ${updatedProductId}`)
      }

      return NextResponse.json({ product: normalizeProduct(updatedProduct) }, { status: 200 })
    }

    const { data: existingProduct, error: existingProductError } = await supabase.from("products").select("*").eq("id", productId).single()

    if (existingProductError || !existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (existingProduct.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const normalizedExistingProduct = normalizeProduct(existingProduct)

    /* UPDATE IMAGE */
    if (images) {
      const normalizedImages = normalizeProductImageUrls(images)
      const stripeImages = normalizedImages.slice(0, STRIPE_MAX_PRODUCT_IMAGES)

      // Update image on Stripe https://stripe.com/docs/api/products/update
      const productResponse = await stripe.products.update(productId, { images: stripeImages })

      const { error: updateImagesError } = await supabase.from("products").update({ img_url: normalizedImages }).eq("id", productId)
      if (updateImagesError)
        throw new Error(`update product images \n Path:/api/products/update/route.ts \n Error message:\n ${updateImagesError.message}`)

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }
      return getUpdatedProductResponse(productId)
    }

    /* UPDATE TRANSLATIONS */
    if (translations) {
      const productResponse = await stripe.products.update(productId, {
        name: translations.fi.title,
        ...getStripeDescriptionPayload(translations.fi.description),
      })

      const { error: updateTranslationsError } = await supabase
        .from("products")
        .update({ translations })
        .eq("id", productId)
      if (updateTranslationsError) {
        throw new Error(
          `update product translations \n Path:/api/products/update/route.ts \n Error message:\n ${updateTranslationsError.message}`,
        )
      }

      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE VARIANTS */
    if (variants !== undefined) {
      const normalizedVariants = normalizeProductVariants(variants, normalizedExistingProduct.price)
      const { error: updateVariantsError } = await supabase.from("products").update({ variants: normalizedVariants }).eq("id", productId)

      if (updateVariantsError)
        throw new Error(`update product variants \n Path:/api/products/update/route.ts \n Error message:\n ${updateVariantsError.message}`)

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE ON STOCK */
    if (typeof onStock === "number") {
      const { error: updateOnStockError } = await supabase.from("products").update({ on_stock: onStock }).eq("id", productId)

      if (updateOnStockError)
        throw new Error(`update product on_stock \n Path:/api/products/update/route.ts \n Error message:\n ${updateOnStockError.message}`)

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE PRICE */
    if (typeof price === "number") {
      //Updating price on stripe its another process - first you archive this product
      //then you create new product with updated price - BS - lmao

      // Create new product on stripe
      if (normalizedExistingProduct) {
        const canonicalTranslation = normalizedExistingProduct.translations.fi
        const productResponse = await stripe.products.create({
          name: canonicalTranslation.title,
          ...getStripeDescriptionPayload(canonicalTranslation.description),
          images: normalizedExistingProduct.img_url?.slice(0, STRIPE_MAX_PRODUCT_IMAGES),
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

        return getUpdatedProductResponse(productResponse.id)
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
    if (error instanceof Error) {
      console.log("PRODUCT_UPDATE_ERROR\n(error)\n", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown product update error" }, { status: 500 })
  }
}
