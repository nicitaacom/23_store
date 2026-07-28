import { NextRequest } from "next/server"

import openai from "@/libs/openai"

export const runtime = "nodejs"

// Which image model an account has differs, and asking for one it does not have answers
// "The model 'x' does not exist". So the first candidate that answers wins, newest first.
// Set OPENAI_IMAGE_MODEL to pin one and skip the search.
const IMAGE_MODEL_CANDIDATES = ["gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"]

function isMissingModelError(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return /does not exist|model_not_found|unknown model/i.test(errorMessage)
}

/**
 * Tries each candidate until one answers. Only a missing model moves on to the next - a rate limit or a
 * refused prompt is thrown straight away, because repeating it against three more models helps nobody.
 */
async function generateWithAvailableModel(prompt: string) {
  const pinnedModel = process.env.OPENAI_IMAGE_MODEL
  const candidates = pinnedModel ? [pinnedModel] : IMAGE_MODEL_CANDIDATES

  for (const model of candidates) {
    try {
      return await openai.images.generate({ model, prompt, n: 1, size: "1024x1024" })
    } catch (error) {
      if (!isMissingModelError(error)) throw error

      console.warn(`[ai/generate-image] "${model}" is not on this account, trying the next candidate`)
    }
  }

  // Every candidate was missing, so the message names them all - the owner reads it in the toast and
  // knows exactly what to put in OPENAI_IMAGE_MODEL.
  throw new Error(
    `No image model on this account. Tried ${candidates.join(", ")} - set OPENAI_IMAGE_MODEL to the one you have.`,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt: string }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Only the parameters every image model takes. `style` and `quality: "standard"` are dall-e-3's own
    // vocabulary and the current API answers 400 "Unknown parameter: 'style'" for them.
    const response = await generateWithAvailableModel(
      `Professional e-commerce product photography of ${prompt}. Studio lighting with soft shadows, clean white or gradient background, centered composition, sharp focus on product, lifestyle context if applicable. High-end catalog quality, photorealistic, appealing presentation with vibrant colors and crisp details.`,
    )

    // Older image models answer with a URL to fetch, newer ones with the bytes already in the response
    const generatedImage = response.data?.[0]

    if (generatedImage?.b64_json) {
      return new Response(Buffer.from(generatedImage.b64_json, "base64"), {
        headers: { "Content-Type": "image/png" },
      })
    }

    if (!generatedImage?.url) {
      return new Response(JSON.stringify({ error: "No image in response" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const imageResponse = await fetch(generatedImage.url)
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch generated image" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    return new Response(imageBuffer, {
      headers: { "Content-Type": "image/png" },
    })
  } catch (error) {
    console.error("Image generation error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error during image generation",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
