import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { getPrintAreaOverlap, isMarkedAreaOnProduct } from "@/utils/printMetrics"
import openai from "@/libs/openai"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

const redis = Redis.fromEnv()
const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(RATE_LIMITS.aiCheckPrintArea.maxAllowed, `${RATE_LIMITS.aiCheckPrintArea.windowSec} s`),
  analytics: false,
})

// The model is asked for one thing it is good at - WHERE the printable surface is in the photo. The
// verdict itself is arithmetic in getPrintAreaOverlap, so it is repeatable and explainable.
const SYSTEM_PROMPT = `You locate the printable surface of a product in a product photo.

The printable surface is the flat area a design gets printed on - the top face of a mousepad, the front
of a t-shirt, the face of a poster. It is NOT the desk, the monitor, the background, the packaging or
any other object in the photo.

Answer with ONLY a JSON object, no prose and no code fence:
{"leftPct":<number>,"topPct":<number>,"widthPct":<number>,"heightPct":<number>}

Every number is a percentage of the whole image, 0 to 100. leftPct/topPct are the top-left corner of the
tightest box around that surface. If the photo shows no printable product surface, answer exactly: null`

type TModelRect = { leftPct: number; topPct: number; widthPct: number; heightPct: number }

function parseProductRect(rawAnswer: string): TModelRect | null {
  const jsonMatch = rawAnswer.match(/\{[^}]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<TModelRect>
    const keys = ["leftPct", "topPct", "widthPct", "heightPct"] as const
    if (!keys.every(key => typeof parsed[key] === "number" && Number.isFinite(parsed[key]))) return null
    if (!(parsed.widthPct! > 0) || !(parsed.heightPct! > 0)) return null

    return { leftPct: parsed.leftPct!, topPct: parsed.topPct!, widthPct: parsed.widthPct!, heightPct: parsed.heightPct! }
  } catch {
    return null
  }
}

/**
 * POST - does the rectangle the owner marked actually sit on the product?
 *
 * "Fix the shape" only gives the rectangle the proportions of the print size in mm. A rectangle over the
 * desk instead of the mousepad passes that and still prints nothing like the physical product, which is
 * what this route catches before the product is created.
 */
export async function POST(req: NextRequest) {
  const reqHeaders = await headers()
  const ip = reqHeaders.get("x-real-ip") || reqHeaders.get("x-forwarded-for") || "127.0.0.1"
  const { success } = await limiter.limit(RATE_LIMITS.aiCheckPrintArea.key(ip))
  if (!success) {
    return NextResponse.json(
      { error: "Too many checks. Please wait a moment." } satisfies API.AICheckPrintAreaResponse,
      { status: 429 },
    )
  }

  const body = (await req.json()) as API.AICheckPrintAreaRequest

  if (!body.mockupUrl?.trim() || !body.mockupRect || !(body.printArea?.widthMm > 0) || !(body.printArea?.heightMm > 0)) {
    return NextResponse.json(
      { error: "mockupUrl, mockupRect and a print area in mm are required" } satisfies API.AICheckPrintAreaResponse,
      { status: 400 },
    )
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This product is printed at ${body.printArea.widthMm} x ${body.printArea.heightMm} mm. Return the box around its printable surface.`,
            },
            { type: "image_url", image_url: { url: body.mockupUrl } },
          ],
        },
      ],
      max_completion_tokens: 2000,
    })

    const productRect = parseProductRect(completion.choices[0]?.message?.content?.trim() || "null")

    // No surface found means nothing to compare against - reported as a mismatch so the owner picks a
    // photo that actually shows the product, which is the same fix either way.
    if (!productRect) {
      return NextResponse.json(
        { isMatching: false, productRect: null, coveragePct: 0, spillPct: 100 } satisfies API.AICheckPrintAreaResponse,
        { status: 200 },
      )
    }

    const overlap = getPrintAreaOverlap(body.mockupRect, productRect)

    return NextResponse.json(
      {
        isMatching: isMarkedAreaOnProduct(overlap),
        productRect,
        coveragePct: Math.round(overlap.coverage * 100),
        spillPct: Math.round(overlap.spill * 100),
      } satisfies API.AICheckPrintAreaResponse,
      { status: 200 },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Print area check failed"
    return NextResponse.json({ error: errorMessage } satisfies API.AICheckPrintAreaResponse, { status: 500 })
  }
}
