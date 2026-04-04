import { NextResponse } from "next/server"

import openai from "@/libs/openai"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { PRODUCT_LOCALES } from "@/utils/product"

const TRANSLATOR_SYSTEM_PROMPT = `Translate the given product title and description into EN, FI, RU, SE.

Rules:
- Word-for-word — no rephrasing, summarizing, or improving
- Preserve formatting, line breaks, and special characters exactly
- Include all 4 languages even if input is already in one of them

Respond ONLY with raw JSON, no markdown:
{"en":{"title":"...","description":"..."},"fi":{"title":"...","description":"..."},"ru":{"title":"...","description":"..."},"se":{"title":"...","description":"..."}}`

const TRANSLATION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: PRODUCT_LOCALES,
  properties: Object.fromEntries(
    PRODUCT_LOCALES.map(locale => [
      locale,
      {
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    ]),
  ),
}

function isProductTranslations(value: unknown): value is ProductTranslations {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return PRODUCT_LOCALES.every(locale => {
    const translation = candidate[locale]

    return (
      !!translation &&
      typeof translation === "object" &&
      typeof (translation as Record<string, unknown>).title === "string" &&
      typeof (translation as Record<string, unknown>).description === "string"
    )
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const title = String(body.title ?? "")
    const description = String(body.description ?? "")

    if (!title.trim() || !description.trim()) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    const response = await openai.responses.create({
      model: "gpt-5-nano",
      instructions: TRANSLATOR_SYSTEM_PROMPT,
      input: `title: ${title}\ndescription: ${description}`,
      // temperature: 0, // DO NOT use temperature with gpt-5-nano
      text: {
        format: {
          type: "json_schema",
          name: "product_translations",
          strict: true,
          schema: TRANSLATION_SCHEMA,
        },
      },
    })

    const outputText = response.output_text?.trim()
    if (!outputText) {
      throw new Error("OpenAI returned an empty translation response")
    }

    const parsed = JSON.parse(outputText) as unknown
    if (!isProductTranslations(parsed)) {
      throw new Error("OpenAI returned an invalid ProductTranslations payload")
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(errorMessage, { status: 500 })
  }
}
