import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import openai from "@/libs/openai"
import { selectDBCategories } from "@/api/categories/select/selectDBCategories"
import { isValidUUID } from "@/utils/isValidUUID"
import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

const redis = Redis.fromEnv()
const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(
    RATE_LIMITS.aiSuggestCategory.maxAllowed,
    `${RATE_LIMITS.aiSuggestCategory.windowSec} s`,
  ),
  analytics: false,
})

export async function POST(req: NextRequest) {
  const reqHeaders = await headers()
  const ip = reqHeaders.get("x-real-ip") || reqHeaders.get("x-forwarded-for") || "127.0.0.1"
  const key = RATE_LIMITS.aiSuggestCategory.key(ip)
  const { success } = await limiter.limit(key)
  if (!success)
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." } satisfies API.AISuggestCategoryResponse,
      { status: 429 },
    )

  const body = (await req.json()) as API.AISuggestCategoryRequest

  if (!body.title || typeof body.title !== "string")
    return NextResponse.json({ error: "title missing" } satisfies API.AISuggestCategoryResponse, { status: 400 })

  const trimmedTitle = body.title.trim()
  if (trimmedTitle.length < 3 || trimmedTitle.length > 500)
    return NextResponse.json(
      { error: "title must be 3–500 chars" } satisfies API.AISuggestCategoryResponse,
      { status: 400 },
    )

  const categoriesResult = await selectDBCategories()
  if (typeof categoriesResult === "string")
    return NextResponse.json({ error: categoriesResult } satisfies API.AISuggestCategoryResponse, { status: 500 })

  const categoryList = categoriesResult.map(c => ({ id: c.id, name: c.name }))

  const systemPrompt = `You are a product categorization assistant for an e-commerce store.
Your only job is to pick the single most fitting category ID from the list below.
Respond with ONLY the UUID — no explanation, no punctuation, nothing else.
If no category fits at all, respond with the word null.

Categories (id → name):
${JSON.stringify(categoryList)}`

  const userPrompt = `Product title: "${trimmedTitle}"${body.description ? `\nProduct description: "${body.description.slice(0, 500)}"` : ""}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 40,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? "null"
    const isKnownId = isValidUUID(raw) && categoryList.some(c => c.id === raw)
    const category_id = isKnownId ? raw : null

    return NextResponse.json({ category_id } satisfies API.AISuggestCategoryResponse, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI call failed"
    return NextResponse.json({ error: msg } satisfies API.AISuggestCategoryResponse, { status: 500 })
  }
}
