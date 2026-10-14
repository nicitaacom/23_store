import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import {
  describeOpenAIRequestFailure,
  getOpenAIRequestError,
  OpenAIImageModelsUnavailableError,
  OpenAIInvalidOutputError,
  OpenAIRequestFailure,
  openAIRequestHeaders,
  requestOpenAIWithRetry,
} from "@/libs/ai/openaiRequest"
import openai from "@/libs/openai"
import {
  AI_IMAGE_DAILY_LIMIT,
  AI_IMAGE_PURCHASE_CYCLE_LIMIT,
  releaseAIImageGeneration,
  reserveAIImageDailyGeneration,
  reserveAIImageGeneration,
} from "@/libs/ai/imageGenerationQuota"

export const runtime = "nodejs"
export const maxDuration = 165

// Which image model an account has differs, and asking for one it does not have answers
// "The model 'x' does not exist". So the first candidate that answers wins, newest first.
const IMAGE_MODEL_CANDIDATES = ["gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"]
type TImageProviderEvidence = { requestIds: string[]; attemptCount: number }

function providerEvidenceHeaders(evidence: TImageProviderEvidence) {
  return {
    ...openAIRequestHeaders(evidence),
  }
}

function isMissingModelError(error: unknown) {
  const providerError = getOpenAIRequestError(error)
  const errorMessage = providerError instanceof Error ? providerError.message : String(providerError)
  return /does not exist|model_not_found|unknown model/i.test(errorMessage)
}

class GeneratedImageDownloadFailure extends Error {
  constructor(readonly attempts: number, readonly providerStatus?: number, readonly timedOut = false) {
    super("The generated image could not be downloaded")
    this.name = "GeneratedImageDownloadFailure"
  }
}

async function downloadGeneratedImage(url: string) {
  const timeouts = [15_000, 45_000] as const

  for (const [attemptIndex, timeout] of timeouts.entries()) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeout) })
      if (response.ok) return { bytes: await response.arrayBuffer(), status: response.status, attempts: attemptIndex + 1 }

      const retryable = response.status === 408 || response.status === 429 || response.status >= 500
      if (!retryable || attemptIndex === timeouts.length - 1) {
        throw new GeneratedImageDownloadFailure(attemptIndex + 1, response.status)
      }
    } catch (error) {
      if (error instanceof GeneratedImageDownloadFailure) throw error
      if (attemptIndex === timeouts.length - 1) {
        const message = error instanceof Error ? error.name : ""
        throw new GeneratedImageDownloadFailure(attemptIndex + 1, undefined, /Timeout|Abort/.test(message))
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new GeneratedImageDownloadFailure(timeouts.length)
}

/**
 * Tries each candidate until one answers. Only a missing model moves on to the next - a rate limit or a
 * refused prompt is thrown straight away, because repeating it against three more models helps nobody.
 */
async function generateWithAvailableModel(prompt: string, evidence: TImageProviderEvidence) {
  for (const model of IMAGE_MODEL_CANDIDATES) {
    try {
      const requestResp = await requestOpenAIWithRetry(async options => {
        const response = await openai.images.generate({ model, prompt, n: 1, size: "1024x1024" }, options)
        if (!response.data?.[0]?.b64_json && !response.data?.[0]?.url) throw new OpenAIInvalidOutputError()
        return response
      })
      evidence.attemptCount += requestResp.attemptCount
      for (const requestId of requestResp.requestIds) {
        if (!evidence.requestIds.includes(requestId)) evidence.requestIds.push(requestId)
      }
      return requestResp.response
    } catch (error) {
      if (error instanceof OpenAIRequestFailure) {
        evidence.attemptCount += error.attemptCount
        for (const requestId of error.requestIds) {
          if (!evidence.requestIds.includes(requestId)) evidence.requestIds.push(requestId)
        }
      }
      if (!isMissingModelError(error)) throw error

      console.warn(`[ai/generate-image] "${model}" is not on this account, trying the next candidate`)
    }
  }

  throw new OpenAIImageModelsUnavailableError()
}

export async function POST(req: NextRequest) {
  const applicationRequestHeaders = { "x-application-request-id": crypto.randomUUID() }
  const providerEvidence: TImageProviderEvidence = { requestIds: [], attemptCount: 0 }
  let promptValue: unknown
  try {
    promptValue = ((await req.json()) as { prompt?: unknown }).prompt
  } catch {
    return new Response(JSON.stringify({ error: "The image request could not be read. Describe the product image and submit it again." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...applicationRequestHeaders },
    })
  }

  if (typeof promptValue !== "string" || !promptValue.trim()) {
    return new Response(JSON.stringify({ error: "Describe the product image before generating it." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...applicationRequestHeaders },
    })
  }

  const supabase = createRouteHandlerClient(
    { cookies },
    { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  )
  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user = data.user
  } catch {
    return new Response(JSON.stringify({
      error: "Your account could not be verified, so no image was generated. Sign in again or contact the store owner if this continues.",
      code: "AI_IMAGE_AUTH_UNAVAILABLE",
    }), { status: 503, headers: { "Content-Type": "application/json", ...applicationRequestHeaders } })
  }

  if (!user) {
    return new Response(JSON.stringify({
      error: "Sign in to generate AI images.",
      code: "AI_IMAGE_AUTH_REQUIRED",
    }), { status: 401, headers: { "Content-Type": "application/json", ...applicationRequestHeaders } })
  }

  let accountReservation: Awaited<ReturnType<typeof reserveAIImageGeneration>>
  try {
    accountReservation = await reserveAIImageGeneration(user.id)
  } catch {
    return new Response(JSON.stringify({
      error: "Your account image allowance could not be checked, so no image was generated. Contact the store owner if this continues.",
      code: "AI_IMAGE_LIMIT_UNAVAILABLE",
    }), { status: 503, headers: { "Content-Type": "application/json", ...applicationRequestHeaders } })
  }

  const getAccountLimitHeaders = (count: number, epoch: number) => ({
    "x-ai-image-account-limit": String(AI_IMAGE_PURCHASE_CYCLE_LIMIT),
    "x-ai-image-account-remaining": String(Math.max(0, AI_IMAGE_PURCHASE_CYCLE_LIMIT - count)),
    "x-ai-image-account-epoch": String(epoch),
  })
  let accountLimitHeaders = getAccountLimitHeaders(accountReservation.count, accountReservation.epoch)

  if (!accountReservation.allowed) {
    return new Response(JSON.stringify({
      error: `You reached your ${AI_IMAGE_PURCHASE_CYCLE_LIMIT}-image account allowance. A verified purchase resets it.`,
      code: "AI_IMAGE_ACCOUNT_LIMIT",
      limit: AI_IMAGE_PURCHASE_CYCLE_LIMIT,
      remaining: 0,
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...applicationRequestHeaders, ...accountLimitHeaders },
    })
  }

  let imageLimit: Awaited<ReturnType<typeof reserveAIImageDailyGeneration>>
  try {
    imageLimit = await reserveAIImageDailyGeneration(user.id)
  } catch {
    try {
      await releaseAIImageGeneration(user.id, accountReservation)
      accountReservation = { ...accountReservation, count: Math.max(0, accountReservation.count - 1) }
      accountLimitHeaders = getAccountLimitHeaders(accountReservation.count, accountReservation.epoch)
    } catch (error) {
      console.error("[ai/generate-image] failed to release account image reservation", error)
    }
    return new Response(JSON.stringify({
      error: "The daily image limit could not be checked, so no image was generated. Contact the store owner if this continues.",
      code: "AI_IMAGE_LIMIT_UNAVAILABLE",
    }), { status: 503, headers: { "Content-Type": "application/json", ...applicationRequestHeaders, ...accountLimitHeaders } })
  }

  let limitHeaders = {
    "x-ratelimit-limit": String(AI_IMAGE_DAILY_LIMIT),
    "x-ratelimit-remaining": String(imageLimit.remaining),
    "x-ratelimit-reset": String(Math.floor(imageLimit.reset / 1000)),
    "x-ratelimit-used": String(imageLimit.count),
    ...accountLimitHeaders,
  }

  if (!imageLimit.allowed) {
    try {
      await releaseAIImageGeneration(user.id, accountReservation)
      accountReservation = { ...accountReservation, count: Math.max(0, accountReservation.count - 1) }
      accountLimitHeaders = getAccountLimitHeaders(accountReservation.count, accountReservation.epoch)
      limitHeaders = { ...limitHeaders, ...accountLimitHeaders }
    } catch (error) {
      console.error("[ai/generate-image] failed to release account image reservation", error)
    }
    const retryAfter = Math.max(1, Math.ceil((imageLimit.reset - Date.now()) / 1000))
    return new Response(JSON.stringify({
      error: `You reached the limit of ${AI_IMAGE_DAILY_LIMIT} AI image generations for today. You can generate another after the limit resets.`,
      code: "AI_IMAGE_DAILY_LIMIT",
      limit: AI_IMAGE_DAILY_LIMIT,
      remaining: 0,
      resetAt: new Date(imageLimit.reset).toISOString(),
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", "retry-after": String(retryAfter), ...applicationRequestHeaders, ...limitHeaders },
    })
  }

  const prompt = promptValue.trim()
  try {
    // Only the parameters every image model takes. `style` and `quality: "standard"` are dall-e-3's own
    // vocabulary and the current API answers 400 "Unknown parameter: 'style'" for them.
    const response = await generateWithAvailableModel(
      `Professional e-commerce product photography of ${prompt}. Studio lighting with soft shadows, clean white or gradient background, centered composition, sharp focus on product, lifestyle context if applicable. High-end catalog quality, photorealistic, appealing presentation with vibrant colors and crisp details.`,
      providerEvidence,
    )
    // OpenAI returned an image, so the generation counts even if its later download fails.
    accountReservation = { ...accountReservation, allowed: false }

    // Older image models answer with a URL to fetch, newer ones with the bytes already in the response
    const generatedImage = response.data?.[0]
    const responseHeaders = {
      "Content-Type": "image/png",
      ...providerEvidenceHeaders(providerEvidence),
      ...applicationRequestHeaders,
      "x-generated-image-download-status": "not-needed",
      ...limitHeaders,
    }

    if (generatedImage?.b64_json) {
      return new Response(Buffer.from(generatedImage.b64_json, "base64"), {
        headers: responseHeaders,
      })
    }

    if (!generatedImage?.url) {
      return new Response(JSON.stringify({
        error: "OpenAI did not return image data. The product image was not added. Contact the store owner if this continues.",
        code: "OPENAI_INVALID_OUTPUT",
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...providerEvidenceHeaders(providerEvidence), ...applicationRequestHeaders, ...limitHeaders },
      })
    }

    let downloadedImage: Awaited<ReturnType<typeof downloadGeneratedImage>>
    try {
      downloadedImage = await downloadGeneratedImage(generatedImage.url)
    } catch (error) {
      if (!(error instanceof GeneratedImageDownloadFailure)) throw error
      const status = error.timedOut ? 504 : 502
      return new Response(JSON.stringify({
        error: `OpenAI created an image, but the store could not download it${error.attempts > 1 ? " after an automatic retry" : ""}. The product image was not added. Contact the store owner if this continues.`,
        code: "GENERATED_IMAGE_DOWNLOAD_FAILED",
      }), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...providerEvidenceHeaders(providerEvidence),
          ...applicationRequestHeaders,
          ...limitHeaders,
          "x-generated-image-download-status": String(error.providerStatus ?? (error.timedOut ? 504 : 0)),
          "x-generated-image-download-attempt-count": String(error.attempts),
        },
      })
    }

    return new Response(downloadedImage.bytes, {
      headers: {
        ...responseHeaders,
        "x-generated-image-download-status": String(downloadedImage.status),
        "x-generated-image-download-attempt-count": String(downloadedImage.attempts),
      },
    })
  } catch (error) {
    if (accountReservation.allowed) {
      try {
        await releaseAIImageGeneration(user.id, accountReservation)
        accountReservation = { ...accountReservation, count: Math.max(0, accountReservation.count - 1) }
        accountLimitHeaders = getAccountLimitHeaders(accountReservation.count, accountReservation.epoch)
        limitHeaders = { ...limitHeaders, ...accountLimitHeaders }
      } catch (releaseError) {
        console.error("[ai/generate-image] failed to release failed-generation reservation", releaseError)
      }
    }
    console.error("Image generation error:", error)
    const failure = describeOpenAIRequestFailure(error, "generate a product image", "The product image was not added.")
    return new Response(
      JSON.stringify({
        error: failure.message,
        code: failure.code,
      }),
      {
        status: failure.status,
        headers: {
          "Content-Type": "application/json",
          ...providerEvidenceHeaders({ attemptCount: failure.attemptCount, requestIds: failure.requestIds }),
          ...applicationRequestHeaders,
          ...limitHeaders,
        },
      },
    )
  }
}
