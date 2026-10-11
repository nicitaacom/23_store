import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

import { activeStorageProvider, fileChangesPaused } from "@/libs/storage/config"
import { deleteStorageObject } from "@/libs/storage/operations"
import { listStorageObjects, storageProvider } from "@/libs/storage/providers"
import { resolveStorageReference } from "@/libs/storage/references"
import { slugifyEmail } from "@/utils/slugify"
import { stripe } from "@/libs/stripe"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"
import type { TStorageProviderName } from "@/ts/storage"

type TRequest = {
  id: string
}

function isMissingStripeResource(error: unknown) {
  return error instanceof Stripe.errors.StripeError && error.code === "resource_missing"
}

export async function POST(request: NextRequest) {
  const { id }: TRequest = await request.json()
  const supabase = await supabaseRouteHandler()

  try {
    if (fileChangesPaused()) return NextResponse.json({ error: "File changes are paused for storage synchronization" }, { status: 503 })
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: product, error: selectProductError } = await supabase
      .from("23_products")
      .select("id, owner_id, price_id, img_url, variants, personalization")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (selectProductError) {
      throw new Error(
        `Selecting product error \n Path:/api/products/delete/route.ts \n Error message:\n ${selectProductError.message}`,
      )
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (product.price_id) {
      try {
        await stripe.prices.update(product.price_id, { active: false })
      } catch (error) {
        if (!isMissingStripeResource(error)) {
          throw error
        }
      }
    }

    try {
      await stripe.products.update(id, { active: false })
    } catch (error) {
      if (!isMissingStripeResource(error)) {
        throw error
      }
    }

    if (!user.email) throw new Error("A verified owner email is required for product file deletion")
    const folder = `${slugifyEmail(user.email)}/${id}`
    const providers = new Set<TStorageProviderName>([activeStorageProvider()])
    const visitReferences = (value: unknown) => {
      const reference = resolveStorageReference(value)
      if (reference) providers.add(reference.provider)
      else if (Array.isArray(value)) value.forEach(visitReferences)
      else if (value && typeof value === "object") Object.values(value).forEach(visitReferences)
    }
    visitReferences([product.img_url, product.variants, product.personalization])
    for (const name of providers) {
      const files = await listStorageObjects(storageProvider(name), "23_product-images", folder)
      for (const file of files) await deleteStorageObject(file)
    }

    const { error: deleteProductError } = await supabase.from("23_products").delete().eq("id", id)
    if (deleteProductError) {
      throw new Error(
        `Delete from 'products' table \n Path:/api/products/delete/route.ts \n Error message:\n ${deleteProductError.message}`,
      )
    }

    return NextResponse.json({ id }, { status: 200 })
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown delete product error"
    console.log("DELETE_PRODUCT_ERROR\n", errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
