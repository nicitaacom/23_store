import { NextRequest } from "next/server"

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

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Professional e-commerce product photography of ${prompt}. Studio lighting with soft shadows, clean white or gradient background, centered composition, sharp focus on product, lifestyle context if applicable. High-end catalog quality, photorealistic, appealing presentation with vibrant colors and crisp details.`,
        n: 1,
        size: "1024x1024",
        quality: "standard", // "hd" | "standard"
        style: "natural", // Added for photorealistic look
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI DALL-E error:", errorText)
      return new Response(JSON.stringify({ error: `DALL-E failed: ${errorText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image URL in response" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const imageResponse = await fetch(imageUrl)
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
