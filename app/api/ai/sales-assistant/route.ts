import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { getSalesAssistantContext, persistConversationTurn, updateWorkingMemory } from "@/libs/ai/chatMemory"

type Message = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: Request) {
  let requestBody: API.AISalesAssistantRequest | null = null

  try {
    requestBody = (await req.json()) as API.AISalesAssistantRequest
    const { promptValue, memory, conversationHistory = [] } = requestBody

    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", memory }, { status: 401 })
    }

    const { recentMessages, semanticContext, recentSource, pineconeMatches } = await getSalesAssistantContext({
      userId: user.id,
      promptValue,
      memory,
      conversationHistory,
    })

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

    // -- functions: addProductToCart + generateImage
    const functions = [
      {
        name: "addProductToCart",
        description: "Add a product to cart with detailed information",
        parameters: {
          type: "object",
          properties: {
            product: {
              type: "object",
              description: "Product details",
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                price: { type: "number" },
              },
              required: ["title", "subtitle", "price"],
            },
            quantity: { type: "number", default: 1 },
            note: { type: "string" },
            t: { type: "string", description: "optional i18n key function name" },
          },
          required: ["product"],
        },
      },
      {
        name: "generateImage",
        description: "Generate an image for a product or idea. Returns { prompt, note }.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Image prompt for the generator" },
            memory: { type: "string", description: "Short context or memory to use in prompt" },
          },
          required: ["prompt"],
        },
      },
    ]

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-nano",
        messages,
        functions,
        function_call: "auto",
        max_tokens: 220,
        temperature: 0.4,
      }),
    })

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text()
      return NextResponse.json({ error: text }, { status: openaiResponse.status })
    }

    const openaiData = await openaiResponse.json()
    const firstChoice = openaiData?.choices?.[0] ?? null
    const aiMessage = firstChoice?.message ?? null
    const assistantReply = typeof aiMessage?.content === "string" ? aiMessage.content.trim() : ""
    const hasFunctionCall = Boolean(aiMessage?.function_call?.name)
    const response = await updateWorkingMemory({
      currentMemory: memory,
      userPrompt: promptValue,
      assistantReply: hasFunctionCall ? "" : assistantReply,
      semanticContext,
    })

    if (!hasFunctionCall && assistantReply) {
      await persistConversationTurn({
        userId: user.id,
        userPrompt: promptValue,
        assistantReply,
        memorySummary: response,
      })
    }

    return NextResponse.json({
      openai: openaiData,
      memory: response,
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
  } catch (error) {
    return NextResponse.json({
      reply: error instanceof Error ? error.message : String(error),
      memory: requestBody?.memory ?? "",
    })
  }
}
