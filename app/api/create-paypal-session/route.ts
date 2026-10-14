import { NextResponse } from "next/server"
import Stripe from "stripe"

import { TProductVariant } from "@/ts/product/TProductVariant"
import { getAuthenticatedPaymentUserId } from "@/libs/payment/getAuthenticatedPaymentUserId"
import { getProductVariantSelectionLabel } from "@/utils/variantOptions"
import { getURL } from "@/utils/helpers"
import { stripe } from "@/libs/stripe"
import { supabaseAdmin } from "@/libs/supabase/supabaseAdmin"

type TPayPalCartItem = {
  productId: string
  variantId?: string | null
  designId?: string | null
  quantity: number
}

type TPayPalProductRow = {
  id: string
  translations: unknown
  price: number
  img_url: string[]
  variants: unknown
}

function getProductTitle(row: TPayPalProductRow) {
  const translations = row.translations as { fi?: { title?: unknown } } | null
  const title = translations?.fi?.title
  if (typeof title !== "string" || !title.trim()) throw new Error("A cart product has no Finnish title")
  return title.trim()
}

function getProductImage(row: TPayPalProductRow, variant: TProductVariant | undefined) {
  const imageValue = variant?.image_url || row.img_url?.[0]
  if (!imageValue) return undefined
  const imageUrl = new URL(imageValue, getURL())
  if (imageUrl.protocol !== "https:") throw new Error("A cart product image is not available over a secure address")
  return imageUrl.toString()
}

function buildPayPalLineItems(
  cart: TPayPalCartItem[],
  productRows: TPayPalProductRow[],
  designs: Array<{ id: string; product_id: string; variant_id: string | null }>,
) {
  const products = new Map(productRows.map(product => [product.id, product]))
  const designsById = new Map(designs.map(design => [design.id, design]))
  return cart.map(item => {
    const product = products.get(item.productId)
    if (!product) throw new Error("A cart product is no longer available")
    const variants = Array.isArray(product.variants) ? product.variants as TProductVariant[] : []
    const variant = item.variantId ? variants.find(candidate => candidate.id === item.variantId) : undefined
    if (item.variantId && !variant) throw new Error("A selected product option is no longer available")
    if (variants.length > 0 && !variant) throw new Error("Choose a product option before starting payment")
    if (item.designId) {
      const design = designsById.get(item.designId)
      if (!design || design.product_id !== product.id || design.variant_id !== (variant?.id ?? null)) {
        throw new Error("A personalized product no longer matches this cart item")
      }
    }

    const unitAmount = Math.round(Number(variant?.price ?? product.price) * 100)
    if (!Number.isSafeInteger(unitAmount) || unitAmount < 1 || unitAmount > 99_999_999) {
      throw new Error("A cart product has an invalid saved price")
    }

    const title = getProductTitle(product)
    const variantName = variant ? `${title} - ${getProductVariantSelectionLabel(variant)}` : title
    const name = item.designId ? `${variantName} · design ${item.designId.slice(0, 8)}` : variantName
    return {
      price_data: {
        currency: "usd",
        product_data: {
          images: [getProductImage(product, variant)].filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
          name,
        },
        unit_amount: unitAmount,
      },
      quantity: item.quantity,
    }
  })
}

export async function POST(request: Request) {
  let body: { products?: unknown; email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Checkout request could not be read. Refresh your cart before starting payment." }, { status: 400 })
  }

  if (!Array.isArray(body.products) || body.products.length === 0 || body.products.length > 100 || body.products.some(item =>
    !item || typeof item.productId !== "string" || !item.productId.trim() || item.productId.length > 200 ||
    (item.variantId !== undefined && item.variantId !== null && (typeof item.variantId !== "string" || item.variantId.length > 200)) ||
    (item.designId !== undefined && item.designId !== null && (typeof item.designId !== "string" || item.designId.length > 200)) ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) {
    return NextResponse.json({ error: "Your cart is empty or has invalid item details. Review the items before starting payment." }, { status: 400 })
  }
  if (body.email !== undefined && body.email !== null && (typeof body.email !== "string" || body.email.length > 320)) {
    return NextResponse.json({ error: "The checkout email address is invalid. Update your account email before starting payment." }, { status: 400 })
  }

  try {
    const getAuthenticatedPaymentUserIdResp = await getAuthenticatedPaymentUserId()
    const cart = body.products as TPayPalCartItem[]
    const productIds = [...new Set(cart.map(item => item.productId))]
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- Guest checkout reads authoritative public product prices, titles, variants, and images.
    const { data: productRows, error: productReadError } = await supabaseAdmin
      .from("23_products")
      .select("id,translations,price,img_url,variants")
      .in("id", productIds)
    if (productReadError) throw productReadError
    if ((productRows ?? []).length !== productIds.length) {
      return NextResponse.json({ error: "A cart product is no longer available. Remove it before starting payment." }, { status: 409 })
    }

    const designIds = [...new Set(cart.flatMap(item => item.designId ? [item.designId] : []))]
    let designs: Array<{ id: string; product_id: string; variant_id: string | null }> = []
    if (designIds.length > 0) {
      // eslint-disable-next-line local-rules/use-rls-supabase-client -- Personalized-design ids are unguessable and are checked against the exact product and option before checkout.
      const { data, error } = await supabaseAdmin.from("23_personalized_designs")
        .select("id,product_id,variant_id")
        .in("id", designIds)
      if (error) throw error
      designs = data ?? []
      if (designs.length !== designIds.length) {
        return NextResponse.json({ error: "A personalized product is no longer available. Remove it and personalize it again." }, { status: 409 })
      }
    }

    const lineItems = buildPayPalLineItems(cart, productRows as TPayPalProductRow[], designs)
    const customer = await stripe.customers.create({ email: typeof body.email === "string" ? body.email : undefined })
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["paypal"],
      mode: "payment",
      ...(getAuthenticatedPaymentUserIdResp ? { client_reference_id: getAuthenticatedPaymentUserIdResp } : {}),
      customer: customer.id,
      line_items: lineItems,
      success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getURL()}/payment/?status=canceled`,
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Stripe did not create a hosted PayPal checkout page. No payment was started." }, { status: 502 })
    }

    const response = NextResponse.json({ url: checkoutSession.url } satisfies API.ProductsCreatePayPalSessionResponse)
    response.headers.set("x-stripe-request-id", checkoutSession.lastResponse.requestId)
    response.headers.set("x-stripe-customer-request-id", customer.lastResponse.requestId)
    response.headers.set("x-application-request-id", crypto.randomUUID())
    return response
  } catch (error) {
    const stripeErrorType = error instanceof Stripe.errors.StripeError ? error.type : null
    const status = stripeErrorType === "StripeAuthenticationError" || stripeErrorType === "StripePermissionError" ||
      stripeErrorType === "StripeRateLimitError" || stripeErrorType === "StripeConnectionError" || stripeErrorType === "StripeAPIError"
      ? 503
      : 500
    console.error("[create-paypal-session] checkout creation failed", {
      errorType: stripeErrorType ?? (error instanceof Error ? error.name : "UnknownError"),
    })
    return NextResponse.json({
      error: "PayPal checkout could not be started. No payment was taken. Contact store support if this continues.",
    }, { status })
  }
}
