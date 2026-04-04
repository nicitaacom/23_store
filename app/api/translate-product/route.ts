import { NextResponse } from "next/server"

import openai from "@/libs/openai"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { PRODUCT_LOCALES } from "@/utils/product"

export const maxDuration = 60
const MAX_LOG_FIELD_LENGTH = 160

const TRANSLATOR_SYSTEM_PROMPT = `Translate the given product title and description into EN, FI, RU, SE.

Rules:
- Word-for-word — no rephrasing, summarizing, or improving
- Preserve formatting, line breaks, and special characters exactly
- Include all 4 languages even if input is already in one of them

Respond fast without doing much reasoning ONLY with raw JSON, no markdown:
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

function trimForLog(value: string, maxLength = MAX_LOG_FIELD_LENGTH) {
  const normalizedValue = value.replace(/\s+/g, " ").trim()
  return normalizedValue.length > maxLength ? `${normalizedValue.slice(0, maxLength)}...` : normalizedValue
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const body = await req.json()
    const title = String(body.title ?? "")
    const description = String(body.description ?? "")

    console.info("[translate-product] request received", {
      requestId,
      titleLength: title.length,
      descriptionLength: description.length,
      titlePreview: trimForLog(title),
      descriptionPreview: trimForLog(description),
    })

    if (!title.trim() || !description.trim()) {
      console.warn("[translate-product] validation failed", {
        requestId,
        titlePresent: Boolean(title.trim()),
        descriptionPresent: Boolean(description.trim()),
      })
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 })
    }

    console.info("[translate-product] requesting OpenAI translation", { requestId })

    const response = await openai.responses.create(
      {
        model: "gpt-5-nano",
        instructions: TRANSLATOR_SYSTEM_PROMPT,
        input: `title: ${title}\ndescription: ${description}`,
        text: {
          format: {
            type: "json_schema",
            name: "product_translations",
            strict: true,
            schema: TRANSLATION_SCHEMA,
          },
        },
      },
      { timeout: 15000 },
    )

    const outputText = response.output_text?.trim()
    if (!outputText) {
      throw new Error("OpenAI returned an empty translation response")
    }

    console.info("[translate-product] OpenAI response received", {
      requestId,
      responseId: response.id,
      outputLength: outputText.length,
      outputPreview: trimForLog(outputText),
    })

    const parsed = JSON.parse(outputText) as unknown
    if (!isProductTranslations(parsed)) {
      throw new Error("OpenAI returned an invalid ProductTranslations payload")
    }

    console.info("[translate-product] translation success", {
      requestId,
      locales: Object.keys(parsed as Record<string, unknown>),
    })

    return NextResponse.json(parsed)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const status = errorMessage.toLowerCase().includes("timeout") ? 504 : 500
    console.error("[translate-product] translation failed", {
      requestId,
      status,
      errorMessage,
      errorName: error instanceof Error ? error.name : typeof error,
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    return new Response(errorMessage, { status })
  }
}
