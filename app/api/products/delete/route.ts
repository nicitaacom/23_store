import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"

import { stripe } from "@/libs/stripe"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

type TRequest = {
  id: string
}

function resolveStoragePaths(imageUrls: unknown) {
  if (!Array.isArray(imageUrls)) {
    return []
  }

  return imageUrls
    .map(url => {
      if (typeof url !== "string" || !url.trim()) {
        return null
      }

      try {
        const pathname = new URL(url).pathname.replace(/^\/+/, "")
        const publicBucketPrefix = "storage/v1/object/public/public-images/"
        const bucketIndex = pathname.indexOf(publicBucketPrefix)

        if (bucketIndex >= 0) {
          return pathname.slice(bucketIndex + publicBucketPrefix.length)
        }
      } catch {}

      return url.split("/").slice(-2).join("/")
    })
    .filter((path): path is string => Boolean(path))
}

function isMissingStripeResource(error: unknown) {
  return error instanceof Stripe.errors.StripeError && error.code === "resource_missing"
}

export async function POST(request: NextRequest) {
  const { id }: TRequest = await request.json()
  const supabase = supabaseServerAction()

  try {
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: product, error: selectProductError } = await supabase
      .from("23_products")
      .select("id, owner_id, price_id, img_url")
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

    const storagePaths = resolveStoragePaths(product.img_url)
    if (storagePaths.length > 0) {
      const { error: deleteFromBucketError } = await supabase.storage.from("public-images").remove(storagePaths)

      if (deleteFromBucketError) {
        console.warn("DELETE_PRODUCT_BUCKET_WARNING", deleteFromBucketError.message)
      }
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
