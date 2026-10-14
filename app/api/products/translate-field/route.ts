import { NextResponse } from "next/server"

import { normalizeProduct } from "@/utils/productVariants"
import openai from "@/libs/openai"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

const LOCALES = ["en", "fi", "ru", "se"] as const
const TRANSLATION_ATTEMPTS = [
  { timeout: 45_000, maxCompletionTokens: 4_000 },
  { timeout: 90_000, maxCompletionTokens: 8_000 },
] as const
const TRANSLATION_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "product_field_translations",
    strict: true,
    schema: {
      type: "object",
      properties: {
        en: { type: "string" },
        fi: { type: "string" },
        ru: { type: "string" },
        se: { type: "string" },
      },
      required: [...LOCALES],
      additionalProperties: false,
    },
  },
} as const
const MIN_PROVIDER_RETRY_DELAY_MS = 500
const MAX_PROVIDER_RETRY_DELAY_MS = 15_000

export const maxDuration = 165

type ProviderErrorDetails = {
  name: string
  message: string
  status?: number
  code?: string
  requestId?: string
}

function getProviderErrorDetails(error: unknown): ProviderErrorDetails {
  if (!(error instanceof Error)) return { name: "UnknownError", message: "" }

  const providerError = error as Error & { status?: unknown; code?: unknown; request_id?: unknown }
  return {
    name: error.name,
    message: error.message,
    ...(typeof providerError.status === "number" ? { status: providerError.status } : {}),
    ...(typeof providerError.code === "string" ? { code: providerError.code } : {}),
    ...(typeof providerError.request_id === "string" ? { requestId: providerError.request_id } : {}),
  }
}

function isInsufficientCredits(error: unknown) {
  const details = getProviderErrorDetails(error)
  const code = details.code?.toLowerCase() ?? ""
  const message = details.message.toLowerCase()
  return (
    code.includes("insufficient_quota") ||
    code.includes("billing_hard_limit") ||
    message.includes("exceeded your current quota") ||
    message.includes("billing hard limit")
  )
}

function isRetryableProviderError(error: unknown) {
  if (isInsufficientCredits(error)) return false

  const { name, status } = getProviderErrorDetails(error)
  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    name === "AbortError"
  )
}

function getProviderRetryDelay(error: unknown) {
  if (!(error instanceof Error)) return MIN_PROVIDER_RETRY_DELAY_MS

  const headers = (error as Error & { headers?: Headers }).headers
  const retryAfter = headers?.get("retry-after")
  if (!retryAfter) return MIN_PROVIDER_RETRY_DELAY_MS

  const retryAfterSeconds = Number(retryAfter)
  const requestedDelay = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1_000 : Date.parse(retryAfter) - Date.now()

  if (!Number.isFinite(requestedDelay) || requestedDelay <= 0) return MIN_PROVIDER_RETRY_DELAY_MS
  return Math.min(Math.max(requestedDelay, MIN_PROVIDER_RETRY_DELAY_MS), MAX_PROVIDER_RETRY_DELAY_MS)
}

function pauseBeforeRetry(error: unknown) {
  return new Promise(resolve => setTimeout(resolve, getProviderRetryDelay(error)))
}

function cleanJsonOutput(raw: string) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
}

function withProviderRequestEvidence(response: NextResponse, requestIds: string[], attemptCount: number) {
  response.headers.set("x-openai-attempt-count", String(attemptCount))
  if (requestIds.length > 0) response.headers.set("x-openai-request-ids", JSON.stringify(requestIds))
  return response
}

function providerFailureResponse(error: unknown, retryWasAttempted: boolean) {
  if (isInsufficientCredits(error)) {
    return NextResponse.json(
      {
        error:
          "Product translations are unavailable because the AI service has no translation credits. Your saved product text is unchanged. Ask the store owner to add AI credits.",
      },
      { status: 503 },
    )
  }

  const { name, status } = getProviderErrorDetails(error)
  if (status === 401 || status === 403) {
    return NextResponse.json(
      {
        error:
          "Product translations are unavailable because the AI service rejected its credentials. Your saved product text is unchanged. Contact support to restore translation access.",
      },
      { status: 503 },
    )
  }

  if (status === 429) {
    return NextResponse.json(
      {
        error:
          "The translation service is still at its request limit after an automatic retry. Your saved product text is unchanged. Contact support to increase translation capacity.",
      },
      { status: 503 },
    )
  }

  if (name.includes("Timeout") || name === "AbortError" || status === 408) {
    return NextResponse.json(
      {
        error: retryWasAttempted
          ? "The translation service timed out after an automatic retry. Your saved product text is unchanged. Contact support if this continues."
          : "The translation service timed out before completing the request. Your saved product text is unchanged. Contact support if this continues.",
      },
      { status: 504 },
    )
  }

  if (!isRetryableProviderError(error)) {
    return NextResponse.json(
      {
        error:
          "The AI service rejected the translation request. Your saved product text is unchanged. Contact support to resolve the service configuration.",
      },
      { status: 502 },
    )
  }

  return NextResponse.json(
    {
      error:
        "The translation service remained unavailable after an automatic retry. Your saved product text is unchanged. Contact support if this continues.",
    },
    { status: 503 },
  )
}

function isValidTranslations(value: unknown): value is API.ProductsTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return LOCALES.every(locale => typeof (value as Record<string, unknown>)[locale] === "object")
}

function isValidAIOutput(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  if (Object.keys(value).length !== LOCALES.length) return false
  return LOCALES.every(
    locale =>
      typeof (value as Record<string, unknown>)[locale] === "string" &&
      (value as Record<string, string>)[locale].trim().length > 0,
  )
}

const SYSTEM_PROMPTS = {
  title: `You are a translation assistant. Translate the product title below into English (en), Finnish (fi), Russian (ru), and Swedish (se).
Return ONLY a raw JSON object — no markdown code block, no explanation, no extra keys.
The response must be exactly this shape:
{"en":"...","fi":"...","ru":"...","se":"..."}`,
  description: `You are a translation assistant. Translate the product description below into English (en), Finnish (fi), Russian (ru), and Swedish (se).
Preserve inline markdown formatting: **bold**, *italic*, _underline_. Do not add or remove any formatting markers.
Return ONLY a raw JSON object — no markdown code block, no explanation, no extra keys.
The response must be exactly this shape:
{"en":"...","fi":"...","ru":"...","se":"..."}`,
}

function refusedTranslationResponse() {
  return NextResponse.json(
    {
      error:
        "The AI service declined to translate this product text. Your saved text is unchanged. Edit the title or description to meet the translation service's content requirements.",
    },
    { status: 422 },
  )
}

export async function POST(req: Request) {
  const body = (await req.json()) as API.ProductsTranslateFieldRequest

  if (!body.productId?.trim()) return NextResponse.json({ error: "productId missing" }, { status: 400 })
  if (!body.field || !SYSTEM_PROMPTS[body.field])
    return NextResponse.json({ error: "field must be 'title' or 'description'" }, { status: 400 })
  if (!body.value?.trim()) return NextResponse.json({ error: "value missing" }, { status: 400 })
  if (!isValidTranslations(body.translations))
    return NextResponse.json({ error: "translations missing or invalid" }, { status: 400 })

  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: existingProduct, error: fetchError } = await supabase
    .from("23_products")
    .select("*")
    .eq("id", body.productId)
    .single()

  if (fetchError || !existingProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (existingProduct.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let translated: Record<string, string> | null = null
  let lastFailure: { kind: "provider"; error: unknown } | { kind: "invalid-output" } | { kind: "refused" } | null = null
  let retryWasAttempted = false
  let providerAttemptCount = 0
  const providerRequestIds: string[] = []

  for (const [attemptIndex, attempt] of TRANSLATION_ATTEMPTS.entries()) {
    if (attemptIndex > 0) {
      retryWasAttempted = true
      await pauseBeforeRetry(lastFailure?.kind === "provider" ? lastFailure.error : undefined)
    }

    try {
      providerAttemptCount += 1
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-6-luna",
          reasoning_effort: "xhigh",
          messages: [
            {
              role: "system",
              content:
                attemptIndex === 0
                  ? SYSTEM_PROMPTS[body.field]
                  : `${SYSTEM_PROMPTS[body.field]}\nThe previous attempt was incomplete. Return a complete object with exactly one non-empty string for each required locale.`,
            },
            { role: "user", content: body.value.trim() },
          ],
          max_completion_tokens: attempt.maxCompletionTokens,
          response_format: TRANSLATION_RESPONSE_FORMAT,
        },
        { timeout: attempt.timeout, maxRetries: 0 },
      )
      if (completion._request_id && !providerRequestIds.includes(completion._request_id)) {
        providerRequestIds.push(completion._request_id)
      }

      const choice = completion.choices[0]
      const cleaned = cleanJsonOutput(choice?.message?.content ?? "")
      let parsed: unknown

      if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
        lastFailure = { kind: "refused" }
        break
      }

      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = null
      }

      if (choice?.finish_reason === "length" || !isValidAIOutput(parsed)) {
        lastFailure = { kind: "invalid-output" }
        console.warn("[translate-field] AI response failed translation validation", {
          attempt: attemptIndex + 1,
          finishReason: choice?.finish_reason ?? "missing-choice",
          requestId: completion._request_id,
        })
        continue
      }

      translated = parsed
      lastFailure = null
      break
    } catch (error) {
      lastFailure = { kind: "provider", error }
      const details = getProviderErrorDetails(error)
      if (details.requestId && !providerRequestIds.includes(details.requestId)) providerRequestIds.push(details.requestId)
      console.error("[translate-field] AI request failed", {
        attempt: attemptIndex + 1,
        name: details.name,
        status: details.status,
        code: details.code,
        requestId: details.requestId,
      })

      if (attemptIndex === TRANSLATION_ATTEMPTS.length - 1 || !isRetryableProviderError(error)) break
    }
  }

  if (!translated) {
    if (lastFailure?.kind === "provider") {
      return withProviderRequestEvidence(
        providerFailureResponse(lastFailure.error, retryWasAttempted),
        providerRequestIds,
        providerAttemptCount,
      )
    }
    if (lastFailure?.kind === "refused") {
      return withProviderRequestEvidence(refusedTranslationResponse(), providerRequestIds, providerAttemptCount)
    }

    return withProviderRequestEvidence(
      NextResponse.json(
        {
          error:
            "The translation service could not create all four translations after an automatic retry. Your saved product text is unchanged. Contact support if this continues.",
        },
        { status: 502 },
      ),
      providerRequestIds,
      providerAttemptCount,
    )
  }

  try {
    const { data: productWithCurrentTranslations, error: translationsReadError } = await supabase
      .from("23_products")
      .select("translations")
      .eq("id", body.productId)
      .single()

    if (translationsReadError || !productWithCurrentTranslations) {
      console.error("[translate-field] current translations could not be read", translationsReadError?.code)
      return withProviderRequestEvidence(
        NextResponse.json(
          {
            error:
              "The latest product text is unavailable. No new translation was stored. Contact support if the product is still available.",
          },
          { status: 500 },
        ),
        providerRequestIds,
        providerAttemptCount,
      )
    }

    if (!isValidTranslations(productWithCurrentTranslations.translations)) {
      console.error("[translate-field] current product translations have an invalid shape")
      return withProviderRequestEvidence(
        NextResponse.json(
          {
            error:
              "The current product translations could not be checked. No new translation was saved. Contact support to repair the product text.",
          },
          { status: 500 },
        ),
        providerRequestIds,
        providerAttemptCount,
      )
    }

    const currentTranslations = productWithCurrentTranslations.translations
    const mergedTranslations: API.ProductsTranslations = {
      en: { ...currentTranslations.en, [body.field]: translated.en },
      fi: { ...currentTranslations.fi, [body.field]: translated.fi },
      ru: { ...currentTranslations.ru, [body.field]: translated.ru },
      se: { ...currentTranslations.se, [body.field]: translated.se },
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from("23_products")
      .update({ translations: mergedTranslations })
      .eq("id", body.productId)
      .select("*")
      .single()

    if (updateError || !updatedProduct) {
      console.error("[translate-field] translated product could not be confirmed", updateError?.code ?? "no-row-returned")
      return withProviderRequestEvidence(
        NextResponse.json(
          {
            error:
              "The translation update could not be confirmed as saved. Check the product text before making another change, and contact support if the translation is missing.",
          },
          { status: 500 },
        ),
        providerRequestIds,
        providerAttemptCount,
      )
    }

    return withProviderRequestEvidence(
      NextResponse.json({ product: normalizeProduct(updatedProduct) } satisfies API.ProductsTranslateFieldResponse, {
        status: 200,
      }),
      providerRequestIds,
      providerAttemptCount,
    )
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError"
    console.error("[translate-field] product update could not be confirmed", errorName)
    return withProviderRequestEvidence(
      NextResponse.json(
        {
          error:
            "The product update could not be confirmed. Check the saved product text before making another change, and contact support if the translation is missing.",
        },
        { status: 500 },
      ),
      providerRequestIds,
      providerAttemptCount,
    )
  }
}
