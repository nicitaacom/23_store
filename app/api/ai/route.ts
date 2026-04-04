import { NextRequest, NextResponse } from "next/server"

import openai from "@/libs/openai"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as API.AIRequest

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      function_call: "auto",
      max_tokens: 200,
      temperature: 0.4,
    })

    const firstChoice = openaiResponse?.choices?.[0] || null
    const aiMessage = firstChoice?.message?.content || ""

    return NextResponse.json({ aiMessage } satisfies API.AIResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ message: `Failed to call AI ${errorMessage}` }, { status: 400 })
  }
}
