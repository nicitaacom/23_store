import { NextRequest, NextResponse } from "next/server"

import {
  describeOpenAIRequestFailure,
  OpenAIInvalidOutputError,
  openAIRequestHeaders,
  requestOpenAIWithRetry,
} from "@/libs/ai/openaiRequest"
import openai from "@/libs/openai"

export const maxDuration = 165

export async function POST(req: NextRequest) {
  let prompt: unknown
  try {
    prompt = ((await req.json()) as API.AIRequest).prompt
  } catch {
    return NextResponse.json({ message: "The AI request could not be read. Enter a question and submit it again." }, { status: 400 })
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ message: "Enter a question before sending it to the AI assistant." }, { status: 400 })
  }
  const promptText = prompt.trim()

  try {
    const openAIResult = await requestOpenAIWithRetry(async options => {
      const response = await openai.responses.create({
        model: "gpt-6-luna",
        reasoning: { effort: "xhigh" },
        input: [{ role: "user", content: promptText }],
        max_output_tokens: 20000,
      }, options)
      if (!response.output_text.trim()) throw new OpenAIInvalidOutputError()
      return response
    })

    const aiMessage = openAIResult.response.output_text.trim()

    const response = NextResponse.json({ aiMessage } satisfies API.AIResponse)
    for (const [name, value] of Object.entries(openAIRequestHeaders(openAIResult))) response.headers.set(name, value)
    return response
  } catch (error) {
    const failure = describeOpenAIRequestFailure(error, "answer your question", "No message was sent.")
    return NextResponse.json(
      { message: failure.message, code: failure.code },
      { status: failure.status, headers: openAIRequestHeaders(failure) },
    )
  }
}
