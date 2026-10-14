import { NextResponse } from "next/server"
import Stripe from "stripe"

import { TProductVariant } from "@/ts/product/TProductVariant"
import { getAuthenticatedPaymentUserId } from "@/libs/payment/getAuthenticatedPaymentUserId"
import { getProductVariantSelectionLabel } from "@/utils/variantOptions"
import { getURL } from "@/utils/helpers"
import { stripe } from "@/libs/stripe"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

type TCheckoutCartItem = {
  productId: string
  variantId?: string | null
  designId?: string | null
  quantity: number
}

type TCheckoutProductRow = {
  id: string
  translations: unknown
  price: number
  img_url: string[]
  variants: unknown
}

class CheckoutInputError extends Error {
  status: number

  constructor(message: string, status = 409) {
    super(message)
    this.status = status
  }
}

function errorResponse(message: string, status: number, requestId: string) {
  return NextResponse.json({ error: message, requestId }, {
    status,
    headers: { "x-application-request-id": requestId },
  })
}

function getDeliveryAddressMetadata(deliveryAddress: API.ProductsCheckoutDeliveryAddress | undefined): Stripe.MetadataParam | undefined {
  if (deliveryAddress === undefined) return undefined

  const { coordinates, countryCode, formattedAddress, providerUri } = deliveryAddress
  const isValidAddress =
    typeof formattedAddress === "string" && formattedAddress.trim().length > 0 && formattedAddress.length <= 500 &&
    countryCode === "DE" &&
    typeof providerUri === "string" && providerUri.startsWith("ymapsbm1://geo?data=") && providerUri.length <= 2_048 &&
    Number.isFinite(coordinates?.latitude) && coordinates.latitude >= -90 && coordinates.latitude <= 90 &&
    Number.isFinite(coordinates?.longitude) && coordinates.longitude >= -180 && coordinates.longitude <= 180

  if (!isValidAddress) throw new Error("Select a valid Yandex delivery address before starting checkout")

  return {
    delivery_address: formattedAddress.trim(),
    delivery_latitude: String(coordinates.latitude),
    delivery_longitude: String(coordinates.longitude),
    delivery_address_provider: "yandex-geocoder",
  }
}

function isAbsoluteHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function getCheckoutImageUrl(row: TCheckoutProductRow, variant: TProductVariant | null) {
  const storedImageUrl = variant?.image_url || row.img_url?.[0]
  if (!storedImageUrl) return undefined

  let resolvedImageUrl: string
  try {
    resolvedImageUrl = new URL(storedImageUrl, getURL()).toString()
  } catch {
    throw new CheckoutInputError("A cart product has an invalid image address. Contact store support to repair the product.")
  }

  if (!isAbsoluteHttpsUrl(resolvedImageUrl)) {
    throw new CheckoutInputError("A cart product image is not available over a secure address. Contact store support to repair the product.")
  }
  return resolvedImageUrl
}

function getCheckoutProductTitle(row: TCheckoutProductRow) {
  const translations = row.translations as { fi?: { title?: unknown } } | null
  const title = translations?.fi?.title
  if (typeof title !== "string" || !title.trim()) {
    throw new CheckoutInputError("A cart product has no Finnish title. Remove it from the cart and contact store support.")
  }
  return title.trim()
}

function buildStripeLineItems(
  cartItems: TCheckoutCartItem[],
  products: TCheckoutProductRow[],
  designs: Array<{ id: string; product_id: string; variant_id: string | null }>,
) {
  const productsById = new Map(products.map(product => [product.id, product]))
  const designsById = new Map(designs.map(design => [design.id, design]))

  return cartItems.map(cartItem => {
    const product = productsById.get(cartItem.productId)
    if (!product) throw new CheckoutInputError("A cart product is no longer available. Remove it from the cart before payment.")

    const variants = Array.isArray(product.variants) ? product.variants as TProductVariant[] : []
    const variant = cartItem.variantId ? variants.find(candidate => candidate.id === cartItem.variantId) ?? null : null
    if (cartItem.variantId && !variant) {
      throw new CheckoutInputError("A selected product option is no longer available. Choose another option before payment.")
    }
    if (variants.length > 0 && !variant) {
      throw new CheckoutInputError("Choose a product option before starting payment.", 400)
    }

    if (cartItem.designId) {
      const design = designsById.get(cartItem.designId)
      if (!design || design.product_id !== product.id || design.variant_id !== (variant?.id ?? null)) {
        throw new CheckoutInputError("A personalized design no longer matches this cart item. Remove the item and personalize it again.")
      }
    }

    const price = variant?.price ?? product.price
    const unitAmount = Math.round(Number(price) * 100)
    if (!Number.isSafeInteger(unitAmount) || unitAmount < 1 || unitAmount > 99_999_999) {
      throw new CheckoutInputError("A cart product has an invalid saved price. Contact store support to repair the product.")
    }

    const baseName = getCheckoutProductTitle(product)
    const variantName = variant ? `${baseName} - ${getProductVariantSelectionLabel(variant)}` : baseName
    const name = cartItem.designId ? `${variantName} · design ${cartItem.designId.slice(0, 8)}` : variantName

    return {
      price_data: {
        currency: "usd",
        product_data: {
          images: [getCheckoutImageUrl(product, variant)].filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
          name,
        },
        unit_amount: unitAmount,
      },
      quantity: cartItem.quantity,
    }
  })
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  let body: API.ProductsCreateCheckoutSessionRequest
  try {
    const parsedBody = await request.json()
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return errorResponse("Checkout request could not be read. Refresh your cart before starting payment.", 400, requestId)
    }
    body = parsedBody as API.ProductsCreateCheckoutSessionRequest
  } catch {
    return errorResponse("Checkout request could not be read. Refresh your cart before starting payment.", 400, requestId)
  }

  if (!Array.isArray(body.products) || body.products.length === 0 || body.products.length > 100 || body.products.some(item =>
    !item || typeof item.productId !== "string" || !item.productId.trim() || item.productId.length > 200 ||
    (item.variantId !== undefined && item.variantId !== null && (typeof item.variantId !== "string" || item.variantId.length > 200)) ||
    (item.designId !== undefined && item.designId !== null && (typeof item.designId !== "string" || item.designId.length > 200)) ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) {
    return errorResponse("Your cart is empty or has invalid item details. Review the items before starting payment.", 400, requestId)
  }
  if (body.email !== undefined && body.email !== null && (typeof body.email !== "string" || body.email.length > 320)) {
    return errorResponse("The checkout email address is invalid. Update your account email before starting payment.", 400, requestId)
  }

  try {
    const productIds = [...new Set(body.products.map(item => item.productId))]
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- Checkout may be guest-facing; the server reads authoritative public product prices, titles and images instead of trusting client values.
    const { data: productRows, error: productReadError } = await supabaseAdmin
      .from("23_products")
      .select("id, translations, price, img_url, variants")
      .in("id", productIds)

    if (productReadError) {
      console.error("[create-checkout-session] product lookup failed", { requestId, code: productReadError.code })
      return errorResponse("Product details could not be checked, so payment was not started. Contact store support.", 503, requestId)
    }

    const products = (productRows ?? []) as TCheckoutProductRow[]
    if (products.length !== productIds.length) {
      return errorResponse("A cart product is no longer available. Remove it from the cart before payment.", 409, requestId)
    }

    const designIds = [...new Set(body.products.flatMap(item => item.designId ? [item.designId] : []))]
    let designs: Array<{ id: string; product_id: string; variant_id: string | null }> = []
    if (designIds.length > 0) {
      // eslint-disable-next-line local-rules/use-rls-supabase-client -- Guest personalization records are public only through their unguessable run item id; validate exact product and variant ownership before checkout.
      const { data, error } = await supabaseAdmin.from("23_personalized_designs")
        .select("id, product_id, variant_id")
        .in("id", designIds)
      if (error) {
        console.error("[create-checkout-session] personalized design lookup failed", { requestId, code: error.code })
        return errorResponse("The personalized product could not be checked, so payment was not started. Contact store support.", 503, requestId)
      }
      designs = data ?? []
      if (designs.length !== designIds.length) {
        return errorResponse("A personalized design is no longer available. Remove the item and personalize it again.", 409, requestId)
      }
    }

    const lineItems = buildStripeLineItems(body.products, products, designs)
    const deliveryAddressMetadata = getDeliveryAddressMetadata(body.deliveryAddress)
    let checkoutUserId: string | null
    try {
      checkoutUserId = await getAuthenticatedPaymentUserId()
    } catch (error) {
      console.error("[create-checkout-session] account lookup failed", {
        requestId,
        errorType: error instanceof Error ? error.name : "UnknownError",
      })
      return errorResponse("Your account could not be verified, so checkout was not started. Sign in again or contact store support.", 503, requestId)
    }

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "required",
      line_items: lineItems,
      mode: "payment",
      ...(checkoutUserId ? { client_reference_id: checkoutUserId } : {}),
      customer_email: body.email || undefined,
      success_url: `${getURL()}payment/?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getURL()}payment/?status=canceled`,
      shipping_address_collection: {
        allowed_countries: ["DE"],
      },
      ...(deliveryAddressMetadata ? { metadata: deliveryAddressMetadata } : {}),
    })

    if (!session.url) {
      return errorResponse("Stripe did not create a hosted checkout page. No payment was started. Contact store support.", 502, requestId)
    }

    const response = NextResponse.json({ url: decodeURIComponent(session.url) } satisfies API.ProductsCreateCheckoutSessionResponse)
    response.headers.set("x-stripe-request-id", session.lastResponse.requestId)
    response.headers.set("x-application-request-id", requestId)
    return response
  } catch (error) {
    if (error instanceof CheckoutInputError) return errorResponse(error.message, error.status, requestId)

    const stripeErrorType = error instanceof Stripe.errors.StripeError ? error.type : null
    const isAddressValidationError = error instanceof Error && error.message === "Select a valid Yandex delivery address before starting checkout"
    const status = isAddressValidationError ? 400
      : stripeErrorType === "StripeInvalidRequestError" ? 422
        : stripeErrorType === "StripeAuthenticationError" || stripeErrorType === "StripePermissionError"
          ? 503
          : stripeErrorType === "StripeRateLimitError" || stripeErrorType === "StripeConnectionError" || stripeErrorType === "StripeAPIError"
            ? 503
            : 500
    const message = isAddressValidationError
      ? "Choose a valid delivery address from the Yandex suggestions before starting checkout."
      : stripeErrorType === "StripeInvalidRequestError"
        ? "Stripe rejected the checkout details. Review the items and delivery address, then contact store support if they look correct. No payment was started."
        : stripeErrorType === "StripeAuthenticationError" || stripeErrorType === "StripePermissionError"
          ? "Stripe checkout is unavailable because the payment account is not configured correctly. No payment was started. Contact store support."
          : stripeErrorType === "StripeRateLimitError" || stripeErrorType === "StripeConnectionError" || stripeErrorType === "StripeAPIError"
            ? "Stripe could not create the checkout session. No payment was started. Contact store support with the request reference."
            : "Checkout could not be started. No payment was started. Contact store support if the problem continues."

    console.error("[create-checkout-session] checkout creation failed", {
      requestId,
      errorType: stripeErrorType ?? (error instanceof Error ? error.name : "UnknownError"),
    })
    return errorResponse(`${message} Reference: ${requestId}.`, status, requestId)
  }
}
