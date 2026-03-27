import { NextResponse } from "next/server"

export const runtime = "nodejs"

const TINIFY_SHRINK_URL = "https://api.tinify.com/shrink"

export async function POST(request: Request) {
  try {
    const rawApiKeys = process.env.TINIFY_API_KEY_ARR
    if (!rawApiKeys?.trim()) {
      return NextResponse.json({ error: "TINIFY_API_KEY_ARR is not configured" }, { status: 500 })
    }

    let apiKeys: string[] = []

    try {
      const parsedValue = JSON.parse(rawApiKeys) as unknown
      if (Array.isArray(parsedValue)) {
        apiKeys = parsedValue.map(value => String(value).trim()).filter(Boolean)
      } else {
        apiKeys = rawApiKeys
          .split(/[,\n]/)
          .map(value => value.trim())
          .filter(Boolean)
      }
    } catch {
      apiKeys = rawApiKeys
        .split(/[,\n]/)
        .map(value => value.trim())
        .filter(Boolean)
    }

    if (!apiKeys.length) {
      return NextResponse.json({ error: "TINIFY_API_KEY_ARR is not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const image = formData.get("image")

    if (!image || typeof image === "string") {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 })
    }

    const imageFile = image as File
    const imageArrayBuffer = await imageFile.arrayBuffer()
    const contentType = imageFile.type || "application/octet-stream"

    let lastErrorMessage = "Tinify compression failed"

    for (const apiKey of apiKeys) {
      try {
        const authorizationHeader = `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`
        const shrinkResponse = await fetch(TINIFY_SHRINK_URL, {
          method: "POST",
          headers: {
            Authorization: authorizationHeader,
            "Content-Type": contentType,
          },
          body: imageArrayBuffer,
        })

        if (!shrinkResponse.ok) {
          const errorText = await shrinkResponse.text()
          throw new Error(`Tinify shrink failed (${shrinkResponse.status}): ${errorText || shrinkResponse.statusText}`)
        }

        const outputUrl = shrinkResponse.headers.get("Location")
        if (!outputUrl) {
          throw new Error("Tinify response missing output location")
        }

        const compressedResponse = await fetch(outputUrl, {
          method: "GET",
          headers: {
            Authorization: authorizationHeader,
          },
        })

        if (!compressedResponse.ok) {
          const errorText = await compressedResponse.text()
          throw new Error(`Tinify output download failed (${compressedResponse.status}): ${errorText || compressedResponse.statusText}`)
        }

        const compressedBuffer = await compressedResponse.arrayBuffer()
        const compressedContentType = compressedResponse.headers.get("Content-Type") || contentType

        return new Response(compressedBuffer, {
          status: 200,
          headers: {
            "Content-Type": compressedContentType,
            "Cache-Control": "no-store",
          },
        })
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : String(error)
        console.error("Tinify key failed, trying next key:", lastErrorMessage)
      }
    }

    return NextResponse.json({ error: lastErrorMessage }, { status: 502 })
  } catch (error) {
    console.error("Tinify route error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown Tinify error",
      },
      { status: 500 },
    )
  }
}
