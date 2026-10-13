import { NextResponse } from "next/server"
import Stripe from "stripe"
import { timingSafeEqual } from "node:crypto"

export const runtime = "nodejs"
export const maxDuration = 60

const stripeTestKeyPrefix = "sk_test_"

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 404 })
}

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) return false

  const authorization = request.headers.get("authorization") ?? ""
  const receivedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
  const expectedBuffer = Buffer.from(expectedSecret)
  const receivedBuffer = Buffer.from(receivedSecret)
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

function responseError(error: string, extra: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ error, ...extra }, { status })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse()

  const runId = request.headers.get("x-e2e-run-id") ?? ""
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/i.test(runId)) {
    return responseError("invalid_run_id", {}, 400)
  }

  const secretKey = process.env.NEXT_STRIPE_SECRET_KEY
  if (!secretKey) return responseError("stripe_key_missing", {}, 503)

  const stripe = new Stripe(secretKey, { maxNetworkRetries: 0, timeout: 10000 })
  try {
    const keyMode = secretKey.startsWith(stripeTestKeyPrefix) ? "test"
      : secretKey.startsWith("sk_live_") ? "live"
        : "unknown"
    if (keyMode === "unknown") return responseError("stripe_key_mode_unknown", {}, 503)

    const account = await stripe.accounts.retrieve()

    if (keyMode !== "test") {
      return NextResponse.json({
        mode: keyMode,
        resourceVerified: false,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        cleanupStatus: "not_needed",
      })
    }

    const stableRunId = runId.toLowerCase()
    const createIdempotencyKey = `23-store-e2e-stripe-mode-${stableRunId}`
    const deactivateIdempotencyKey = `${createIdempotencyKey}-deactivate`
    let product: Stripe.Product | null = null
    let cleanupVerified = false
    let livemode: boolean | null = null
    let failure = "stripe_resource_verification_failed"

    try {
      product = await stripe.products.create({
        name: `23_store E2E Stripe mode check ${stableRunId}`,
        active: true,
        metadata: { e2e_suite: "23-store", e2e_kind: "stripe-mode-check", e2e_run_id: stableRunId },
      }, { idempotencyKey: createIdempotencyKey })
      livemode = product.livemode
      if (livemode) failure = "stripe_resource_returned_live_mode"
    } finally {
      if (product?.active) {
        try {
          await stripe.products.update(product.id, { active: false }, { idempotencyKey: deactivateIdempotencyKey })
        } catch {
          failure = "stripe_resource_cleanup_failed"
        }
      }
      if (product) {
        try {
          const inactiveProduct = await stripe.products.retrieve(product.id)
          cleanupVerified = inactiveProduct.id === product.id && inactiveProduct.active === false
          if (!cleanupVerified) failure = "stripe_resource_cleanup_unverified"
        } catch {
          failure = "stripe_resource_cleanup_unverified"
        }
      }
    }

    if (!product || livemode !== false || !cleanupVerified) {
      return responseError(failure, {
        mode: "test",
        resourceVerified: livemode === false,
        livemode,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        productId: product?.id ?? null,
        cleanupStatus: cleanupVerified ? "verified" : "failed",
      }, 502)
    }

    return NextResponse.json({
      mode: "test",
      resourceVerified: true,
      livemode: false,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      productId: product.id,
      cleanupStatus: "verified",
    })
  } catch {
    return responseError("stripe_mode_check_failed", {}, 502)
  }
}
