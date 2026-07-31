import { NextResponse } from "next/server"
import Stripe from "stripe"

import { TProductPersonalization } from "@/ts/product/TPersonalization"
import { TProductTranslations } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { getRunPersonalizationSqlMessage, isMissingSchemaError } from "@/utils/personalizationSchema"
import { normalizeProduct, normalizeProductVariants } from "@/utils/productVariants"
import { normalizeProductImageUrls } from "@/utils/product"
import { stripe } from "@/libs/stripe"
import { supabaseAdmin } from "@/libs/supabase/supabaseAdmin"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"
import { MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"
import { STRIPE_MAX_PRODUCT_IMAGES } from "@/constants/uploadLimits"

export type TUpdateProductRequest = {
  productId: string
  images?: string[]
  translations?: TProductTranslations
  price?: number
  onStock?: number
  variants?: TProductVariant[] | null
  category_id?: string | null
  personalization?: TProductPersonalization | null
}

export async function POST(req: Request) {
  const body: TUpdateProductRequest = await req.json()

  const supabase = await supabaseRouteHandler()
  const productId = body.productId
  const images = body.images
  const translations = body.translations
  const price = body.price
  const onStock = body.onStock
  const variants = body.variants
  const category_id = body.category_id
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
        .from("23_products")
        .select("*")
        .eq("id", updatedProductId)
        .single()

      if (updatedProductError || !updatedProduct) {
        throw new Error(`Updated product not found for id ${updatedProductId}`)
      }

      return NextResponse.json({ product: normalizeProduct(updatedProduct) }, { status: 200 })
    }

    const { data: existingProduct, error: existingProductError } = await supabase
      .from("23_products")
      .select("*")
      .eq("id", productId)
      .single()

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

      const { error: updateImagesError } = await supabase
        .from("23_products")
        .update({ img_url: normalizedImages })
        .eq("id", productId)
      if (updateImagesError)
        throw new Error(
          `update product images \n Path:/api/products/update/route.ts \n Error message:\n ${updateImagesError.message}`,
        )

      //Active product if it not active
      if (!productResponse.active) {
        await stripe.products.update(productId, { active: true })
      }
      return getUpdatedProductResponse(productId)
    }

    /* UPDATE TRANSLATIONS */
    if (translations) {
      const fiTitle = translations.fi.title.trim()

      if (!fiTitle) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 })
      }

      if (fiTitle.length < MIN_PRODUCT_TITLE_LENGTH) {
        return NextResponse.json(
          { error: `Title is too short - minimum ${MIN_PRODUCT_TITLE_LENGTH} characters` },
          { status: 400 },
        )
      }

      if (fiTitle.length > MAX_PRODUCT_TITLE_LENGTH) {
        return NextResponse.json({ error: `Title is too long - maximum ${MAX_PRODUCT_TITLE_LENGTH} characters` }, { status: 400 })
      }

      const productResponse = await stripe.products.update(productId, {
        name: fiTitle,
        ...getStripeDescriptionPayload(translations.fi.description),
      })

      const { error: updateTranslationsError } = await supabase.from("23_products").update({ translations }).eq("id", productId)
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
      const normalizedVariants = normalizeProductVariants(
        variants,
        normalizedExistingProduct.price,
        normalizedExistingProduct.on_stock,
      )
      // When a product has variants its stock is the accumulated stock of those variants.
      // No variants → leave on_stock untouched (variantless products keep their manual value).
      const variantsUpdate = normalizedVariants
        ? { variants: normalizedVariants, on_stock: normalizedVariants.reduce((sum, variant) => sum + variant.quantity, 0) }
        : { variants: null }
      const { error: updateVariantsError } = await supabase.from("23_products").update(variantsUpdate).eq("id", productId)

      if (updateVariantsError)
        throw new Error(
          `update product variants \n Path:/api/products/update/route.ts \n Error message:\n ${updateVariantsError.message}`,
        )

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE ON STOCK */
    if (typeof onStock === "number") {
      const { error: updateOnStockError } = await supabase.from("23_products").update({ on_stock: onStock }).eq("id", productId)

      if (updateOnStockError)
        throw new Error(
          `update product on_stock \n Path:/api/products/update/route.ts \n Error message:\n ${updateOnStockError.message}`,
        )

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE PRICE */
    if (typeof price === "number") {
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Price must be greater than zero" }, { status: 400 })
      }

      const priceResponse = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(price * 100),
        currency: "usd",
      })
      let databaseCommitted = false

      try {
        await stripe.products.update(productId, { default_price: priceResponse.id })

        const { error: updatePriceError } = await supabase
          .from("23_products")
          .update({
            price,
            price_id: priceResponse.id,
            // A deliberate owner edit is the new anchor. AI approvals never touch this column.
            ai_price_baseline: price,
          })
          .eq("id", productId)

        if (isMissingSchemaError(updatePriceError)) {
          const { error: legacyUpdatePriceError } = await supabase
            .from("23_products")
            .update({ price, price_id: priceResponse.id })
            .eq("id", productId)
          if (legacyUpdatePriceError) throw legacyUpdatePriceError
        } else if (updatePriceError) {
          throw updatePriceError
        }
        databaseCommitted = true

        // eslint-disable-next-line local-rules/use-rls-supabase-client -- owner was verified above; only the server may expire proposal state
        await supabaseAdmin
          .from("23_ai_price_proposals")
          .update({ status: "expired", reviewed_at: new Date().toISOString() })
          .eq("product_id", productId)
          .eq("owner_id", user.id)
          .eq("status", "pending")

        try {
          await stripe.prices.update(existingProduct.price_id, { active: false })
        } catch (error) {
          console.error("[products/update] old Stripe price stayed active", {
            priceId: existingProduct.price_id,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        return getUpdatedProductResponse(productId)
      } catch (error) {
        if (!databaseCommitted) {
          const { data: latestProduct } = await supabase
            .from("23_products")
            .select("price_id")
            .eq("id", productId)
            .maybeSingle()

          if (latestProduct?.price_id !== priceResponse.id) {
            try {
              await stripe.products.update(productId, { default_price: latestProduct?.price_id ?? existingProduct.price_id })
              await stripe.prices.update(priceResponse.id, { active: false })
            } catch {}
          }
        }
        throw error
      }
    }

    /* UPDATE PERSONALIZATION */
    if ("personalization" in body) {
      const { error: updatePersonalizationError } = await supabase
        .from("23_products")
        .update({ personalization: body.personalization ?? null })
        .eq("id", productId)

      // The personalization column arrives with the hand-run SQL block, so a database without it
      // answers with a Postgres message the owner has no way to act on - name the block instead.
      if (isMissingSchemaError(updatePersonalizationError)) {
        return NextResponse.json(
          { error: getRunPersonalizationSqlMessage('The "personalization" column of 23_products') },
          { status: 503 },
        )
      }

      if (updatePersonalizationError)
        throw new Error(
          `update product personalization \n Path:/api/products/update/route.ts \n Error message:\n ${updatePersonalizationError.message}`,
        )

      return getUpdatedProductResponse(productId)
    }

    /* UPDATE CATEGORY */
    if ("category_id" in body) {
      const { error: updateCategoryError } = await supabase
        .from("23_products")
        .update({ category_id: category_id ?? null })
        .eq("id", productId)

      if (updateCategoryError)
        throw new Error(
          `update product category_id \n Path:/api/products/update/route.ts \n Error message:\n ${updateCategoryError.message}`,
        )

      return getUpdatedProductResponse(productId)
    }

    return NextResponse.json({ error: "No valid update payload provided" }, { status: 400 })
  } catch (error) {
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
