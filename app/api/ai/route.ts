import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as API.AIRequest

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        function_call: "auto",
        max_tokens: 200,
        temperature: 0.4,
      }),
    })

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text()
      return NextResponse.json({ error: text }, { status: openaiResponse.status })
    }

    const openaiData = await openaiResponse.json()

    const firstChoice = openaiData?.choices?.[0] || null
    const aiMessage = firstChoice?.message ?? null

    return NextResponse.json({ aiMessage } as API.AIResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ message: `Failed to call AI ${errorMessage}` }, { status: 400 })
  }
}
