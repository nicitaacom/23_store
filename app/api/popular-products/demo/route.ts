import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { createRawProductTranslations } from "@/utils/product"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"
import { TablesInsert } from "@/ts/types_db"

const PLACEHOLDER_IMAGE = "/placeholder.jpg"
const FAKE_SHOP_API_URL = "http://fake-shop-api.ap-south-1.elasticbeanstalk.com/app/v1/products"

const PRODUCT_PREFIXES = ["Starter", "Prime", "Essential", "Urban", "Smart", "Studio", "Travel", "Daily", "Core", "Select"]

const PRODUCT_NOUNS = ["Bundle", "Kit", "Pack", "Collection", "Edition", "Set", "Drop", "Series", "Line", "Combo"]

type FakeShopProduct = {
  _id?: string
  title?: string
  name?: string
  description?: string
  shortDescription?: string
  price?: number | string
  images?: string[]
  image?: string
  category?: string | { name?: string }
  stock?: number
  rating?: number
  brand?: string
}

function formatFakeProductSeed(
  sourceProduct: FakeShopProduct | undefined,
  index: number,
  ownerId: string,
): TablesInsert<"23_products"> {
  const prefix = PRODUCT_PREFIXES[index % PRODUCT_PREFIXES.length]
  const noun = PRODUCT_NOUNS[index % PRODUCT_NOUNS.length]
  const itemNumber = String(index + 1).padStart(3, "0")
  const ownerFragment = ownerId.replace(/-/g, "").slice(0, 12)
  const baseTitle = sourceProduct?.title || sourceProduct?.name || `${prefix} ${noun}`
  const categoryName =
    typeof sourceProduct?.category === "string" ? sourceProduct.category : sourceProduct?.category?.name || "general"
  const baseDescription =
    sourceProduct?.description ||
    sourceProduct?.shortDescription ||
    `Demo-ready showcase product ${itemNumber} built from FakeShopAPI sample data.`
  const rawPrice = Number(sourceProduct?.price)
  const price = Number((Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 14 + (index % 17) * 3.35 + index / 50).toFixed(2))
  const stockValue =
    typeof sourceProduct?.stock === "number" && sourceProduct.stock > 0 ? sourceProduct.stock : 240 - (index % 80)
  const imageCandidates = sourceProduct?.images?.filter(Boolean) || []
  const primaryImage = sourceProduct?.image || imageCandidates[0] || PLACEHOLDER_IMAGE
  const secondaryImages = imageCandidates.slice(0, 3)
  const uniqueImages = Array.from(new Set([primaryImage, ...secondaryImages])).slice(0, 4)
  const brandLabel = sourceProduct?.brand ? `${sourceProduct.brand} ` : ""
  const subtitle = `${brandLabel}${baseDescription} Category: ${categoryName}. Demo item ${itemNumber}.`

  return {
    id: `demo-popular-product-${ownerFragment}-${itemNumber}`,
    price_id: `demo-price-${ownerFragment}-${itemNumber}`,
    owner_id: ownerId,
    translations: createRawProductTranslations(`${baseTitle} ${itemNumber}`, subtitle),
    price,
    on_stock: stockValue,
    img_url: uniqueImages.length ? uniqueImages : [PLACEHOLDER_IMAGE],
  }
}

// eslint-disable-next-line local-rules/sdk-method-naming -- genuine 3rd-party fetch (fakestoreapi.com), not a DB/Redis read
async function fetchFakeShopProducts() {
  const response = await fetch(FAKE_SHOP_API_URL, {
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response))
  }

  const data = await response.json()

  const products: FakeShopProduct[] = data?.Data || data?.data || data?.products || data?.result || []

  return Array.isArray(products) ? products : []
}

async function resolveOwnerId() {
  const supabase = createRouteHandlerClient(
    { cookies },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id || null
}

export async function GET() {
  const ownerId = await resolveOwnerId()

  if (!ownerId) {
    return NextResponse.json({ error: "Missing authenticated user" }, { status: 401 })
  }

  const supabase = createRouteHandlerClient(
    { cookies },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
  const ownerFragment = ownerId.replace(/-/g, "").slice(0, 12)
  const response = await supabase
    .from("23_products")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .like("id", `demo-popular-product-${ownerFragment}-%`)

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ownerId,
    seededProducts: response.count ?? 0,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const count = Math.min(400, Math.max(1, Number(body.count) || 1))
  const startAt = Math.max(0, Number(body.startAt) || 0)
  const ownerId = await resolveOwnerId()

  if (!ownerId) {
    return NextResponse.json({ error: "Missing authenticated user" }, { status: 401 })
  }

  const fakeShopProducts = await fetchFakeShopProducts().catch(() => [])
  const products = Array.from({ length: count }, (_, offset) => {
    const index = startAt + offset
    const sourceProduct = fakeShopProducts.length ? fakeShopProducts[index % fakeShopProducts.length] : undefined
    return formatFakeProductSeed(sourceProduct, index, ownerId)
  })

  const supabase = createRouteHandlerClient(
    { cookies },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
  const response = await supabase.from("23_products").insert(products).select("id")

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 })
  }

  return NextResponse.json({
    ownerId,
    countRequested: count,
    countProcessed: response.data.length,
    firstId: products[0]?.id,
    lastId: products[products.length - 1]?.id,
  })
}
