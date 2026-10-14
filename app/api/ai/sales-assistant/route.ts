import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import type { FunctionTool, ResponseFunctionToolCall } from "openai/resources/responses/responses"

import {
  describeOpenAIRequestFailure,
  OpenAIInvalidOutputError,
  OpenAIRequestFailure,
  openAIRequestHeaders,
  requestOpenAIWithRetry,
} from "@/libs/ai/openaiRequest"
import { getSalesAssistantContext, persistConversationTurn, updateWorkingMemory } from "@/libs/ai/chatMemory"
import openai from "@/libs/openai"

type Message = { role: "system" | "user" | "assistant"; content: string }

export const maxDuration = 165

export async function POST(req: Request) {
  let requestBody: API.AISalesAssistantRequest | null = null
  try {
    requestBody = (await req.json()) as API.AISalesAssistantRequest
  } catch {
    return NextResponse.json({ error: "The sales assistant could not read your message. Enter a message and submit it again." }, { status: 400 })
  }

  if (typeof requestBody.promptValue !== "string" || !requestBody.promptValue.trim()) {
    return NextResponse.json({ error: "Enter a message before contacting the sales assistant." }, { status: 400 })
  }

  let operationStage = "read your conversation"
  try {
    const { promptValue, memory, conversationHistory = [] } = requestBody

    const supabase = createRouteHandlerClient(
      { cookies },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", memory }, { status: 401 })
    }

    const {
      recentMessages,
      semanticContext,
      recentSource,
      pineconeMatches,
      embeddingRequestIds,
      embeddingAttemptCount,
    } = await getSalesAssistantContext({ userId: user.id, promptValue, memory, conversationHistory })

    const systemPrompt = `You are a sales assistant for Joki e-commerce.
Reply in the user's latest language.
Keep replies concise: 2-4 sentences.
Avoid repeating already suggested products.
If the user rejects options, ask a short clarifying question.
For vague requests, suggest 3-5 concrete products with name, price, benefit.
If user wants to buy/add/purchase/lisaa/osta/добавь, call addProductToCart.
If user wants an image, call generateImage.

Working memory:
${memory || "none"}

Retrieved context:
${semanticContext || "none"}`

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
      { role: "user", content: promptValue },
    ]

    // The Responses API supports GPT-6 Luna function tools with xhigh reasoning.
    const tools: FunctionTool[] = [
      {
        type: "function",
        strict: true,
        name: "addProductToCart",
        description: "Add a product to cart with detailed information",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            product: {
              type: "object",
              description: "Product details",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                price: { type: "number" },
              },
              required: ["title", "subtitle", "price"],
            },
            quantity: { type: "number", description: "Quantity to add" },
            note: { type: ["string", "null"] },
            t: { type: ["string", "null"], description: "optional i18n key function name" },
          },
          required: ["product", "quantity", "note", "t"],
        },
      },
      {
        type: "function",
        strict: true,
        name: "generateImage",
        description: "Generate an image for a product or idea. Returns { prompt, note }.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            prompt: { type: "string", description: "Image prompt for the generator" },
            memory: { type: ["string", "null"], description: "Short context or memory to use in prompt" },
          },
          required: ["prompt", "memory"],
        },
      },
    ]

    operationStage = "generate a reply"
    const openAIResult = await requestOpenAIWithRetry(async options => {
      const response = await openai.responses.create({
      model: "gpt-6-luna",
      reasoning: { effort: "xhigh" },
      input: messages,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_output_tokens: 3000,
      }, options)
      const hasToolCall = response.output.some(item => item.type === "function_call")
      if (!hasToolCall && !response.output_text.trim()) throw new OpenAIInvalidOutputError()
      return response
    })

    const openaiResponse = openAIResult.response
    const functionCall = openaiResponse.output.find(
      (item): item is ResponseFunctionToolCall => item.type === "function_call",
    )
    const assistantReply = openaiResponse.output_text.trim()
    const hasFunctionCall = Boolean(functionCall)
    operationStage = "prepare the reply"
    const response = await updateWorkingMemory({
      currentMemory: memory,
      userPrompt: promptValue,
      assistantReply: hasFunctionCall ? "" : assistantReply,
      semanticContext,
    })

    let memoryWriteEvidence = { requestIds: [] as string[], attemptCount: 0, warnings: [] as string[] }
    if (!hasFunctionCall && assistantReply) {
      operationStage = "save the conversation"
      memoryWriteEvidence = await persistConversationTurn({
        userId: user.id,
        userPrompt: promptValue,
        assistantReply,
        memorySummary: response,
      })
    }

    const routeResponse = NextResponse.json({
      assistantMessage: {
        content: assistantReply,
        ...(functionCall ? {
          functionCall: {
            name: functionCall.name,
            arguments: functionCall.arguments,
          },
        } : {}),
      },
      memory: response,
      warnings: memoryWriteEvidence.warnings,
      debug:
        process.env.NODE_ENV === "development"
          ? {
              semanticContext,
              recentMessages,
              recentSource,
              pineconeMatches,
            }
          : undefined,
    } as API.AISalesAssistantResponse)
    for (const [name, value] of Object.entries(openAIRequestHeaders(openAIResult))) routeResponse.headers.set(name, value)
    const embeddingIds = [...new Set([...embeddingRequestIds, ...memoryWriteEvidence.requestIds])]
    routeResponse.headers.set("x-openai-embedding-attempt-count", String(embeddingAttemptCount + memoryWriteEvidence.attemptCount))
    if (embeddingIds.length) routeResponse.headers.set("x-openai-embedding-request-ids", JSON.stringify(embeddingIds))
    return routeResponse
  } catch (error) {
    if (error instanceof OpenAIRequestFailure || error instanceof OpenAIInvalidOutputError) {
      const failure = describeOpenAIRequestFailure(error, "answer your message", "Your message was not added to the conversation.")
      return NextResponse.json({
        error: failure.message,
        code: failure.code,
        memory: requestBody.memory ?? "",
      }, { status: failure.status, headers: openAIRequestHeaders(failure) })
    }

    return NextResponse.json({
      error: `The sales assistant could not ${operationStage}. Your message was not added to the conversation. Contact the store owner if this continues.`,
      memory: requestBody.memory ?? "",
    }, { status: 503 })
  }
}
