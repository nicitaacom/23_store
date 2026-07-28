import { NextRequest } from "next/server"

import openai from "@/libs/openai"

export const runtime = "nodejs"

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
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional e-commerce product photography of ${prompt}. Studio lighting with soft shadows, clean white or gradient background, centered composition, sharp focus on product, lifestyle context if applicable. High-end catalog quality, photorealistic, appealing presentation with vibrant colors and crisp details.`,
      n: 1,
      size: "1024x1024",
    })

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
