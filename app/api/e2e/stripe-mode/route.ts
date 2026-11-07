import { NextResponse } from "next/server"

export const runtime = "nodejs"
// eslint-disable-next-line local-rules/no-banned-words -- Required HTTP protocol directive for private provider state.
const noStoreHeaders = { "cache-control": "no-store" }

/**
 * This read-only diagnostic lets the scheduled browser runner verify that production checkout is
 * configured for Stripe TEST. It exposes only the mode, never the key or account details.
 */
export async function GET() {
  const secretKey = process.env.NEXT_STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe checkout is not configured." }, { status: 503, headers: noStoreHeaders })
  }

  const mode = secretKey.startsWith("sk_test_") ? "test"
    : secretKey.startsWith("sk_live_") ? "live"
      : "unknown"
  if (mode === "unknown") {
    return NextResponse.json({ error: "Stripe checkout mode could not be identified." }, { status: 503, headers: noStoreHeaders })
  }

  return NextResponse.json({
    mode,
    livemode: mode === "live",
  }, { headers: noStoreHeaders })
}
