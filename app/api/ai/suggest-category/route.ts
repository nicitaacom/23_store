import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { isValidUUID } from "@/utils/isValidUUID"
import openai from "@/libs/openai"
import { selectDBCategories } from "@/api/categories/select/selectDBCategories"
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

  const selectDBCategoriesResp = await selectDBCategories()
  if (typeof selectDBCategoriesResp === "string")
    return NextResponse.json({ error: selectDBCategoriesResp } satisfies API.AISuggestCategoryResponse, { status: 500 })

  const categoryList = selectDBCategoriesResp.map(category => ({ id: category.id, name: category.name }))

  const categoryLines = categoryList
    .map((category, index) => `${index + 1}. "${category.name}" = ${category.id}`)
    .join("\n")

  const systemPrompt = `You are a product categorization assistant for an e-commerce store.
Your only job is to pick the single most fitting category ID from the list below.

Rules:
- Pick the MOST SPECIFIC, NARROWEST category that matches the product's primary purpose.
- If both a broad and a narrow category fit, ALWAYS pick the narrow one. Never pick a parent/general category when a more specific child exists.
- Example: "Aloe Vera Gel" belongs to "Facial Care", NOT "Skin Care" or "Makeup" — always prefer the narrowest match.
- Example: "Insulated Noodle Bowl" belongs to "Food Service Equipment" or "Kitchen", NOT "Home & Garden".
- Respond with ONLY the UUID of the chosen category — no explanation, no punctuation, nothing else.
- If no category is a clear match, respond with the word null.

Available categories:
${categoryLines}`

  const userPrompt = `Product title: "${trimmedTitle}"`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 2000,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || "null"
    const isKnownId = isValidUUID(raw) && categoryList.some(category => category.id === raw)
    const category_id = isKnownId ? raw : null

    return NextResponse.json({ category_id } satisfies API.AISuggestCategoryResponse, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI call failed"
    return NextResponse.json({ error: msg } satisfies API.AISuggestCategoryResponse, { status: 500 })
  }
}
