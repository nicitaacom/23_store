import { NextRequest, NextResponse } from "next/server"

type Message = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  try {
    const { promptValue, memory, conversationHistory = [] } = (await req.json()) as API.AISalesAssistantRequest

    const lastTwoMessages = conversationHistory
      .slice(-4)
      .map(msg => ({ role: msg.role === "ai" ? "assistant" : "user", content: msg.text })) as Message[]

    const systemPrompt = `You are a RELENTLESS SALES ASSISTANT for Joki e-commerce.

Memory: ${memory || "none"}

CORE RULES:
1. Always respond in the SAME LANGUAGE as the user's LAST message.
2. Never refuse requests — always suggest alternatives.
3. Track all suggested products in memory to avoid repeating.
4. Keep responses concise: 2-4 sentences max.
5. If user rejects products → ask what exactly they want (color? price? category? purpose?).

CONVERSATION FLOW:
- Vague request → List 3-5 specific products (Name - Price - Benefit).
- User says "no/ei/нет" → Ask clarifying questions to understand their exact need.
- User clarifies → List NEW products matching criteria.
- User confirms → Call addProductToCart or generateImage (if user asks for image).

FUNCTION TRIGGERS:
Keywords: "add to cart", "buy", "purchase", "lisää", "osta", "добавь" → Call addProductToCart.
If user asks to "generate image", "make image", "create picture" → Call generateImage.

CONTEXT AWARENESS:
- Do not repeat previously suggested products.
- Adapt suggestions based on rejection reasons.
- Always respect user's language from their last message.
- If language cannot be detected, default to English.
`

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...lastTwoMessages,
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
        model: "gpt-4o-mini",
        messages,
        functions,
        function_call: "auto",
        max_tokens: 300,
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

    const updatedMemory = await updateMemoryFn(memory, promptValue, aiMessage)

    return NextResponse.json({
      openai: openaiData,
      memory: updatedMemory,
    } as API.AISalesAssistantResponse)
  } catch (error) {
    return NextResponse.json({
      reply: error instanceof Error ? error.message : String(error),
      memory: "",
    })
  }
}

// keep your existing updateMemoryFn unchanged...
async function updateMemoryFn(currentMemory: string, userPrompt: string, aiMessage?: any): Promise<string> {
  let intermediateMemory = currentMemory
  try {
    if (aiMessage?.function_call?.name === "addProductToCart") {
      const args = JSON.parse(aiMessage.function_call.arguments || "{}")
      const product = args.product
      const quantity = args.quantity || 1
      if (product?.title) {
        const memoryItems = intermediateMemory ? intermediateMemory.split(" | ") : []
        const newItem = quantity > 1 ? `${quantity}x ${product.title}` : product.title
        memoryItems.push(newItem)
        intermediateMemory = memoryItems.join(" | ")
      }
    } else if (userPrompt) {
      const memoryItems = intermediateMemory ? intermediateMemory.split(" | ") : []
      memoryItems.push(userPrompt)
      intermediateMemory = memoryItems.join(" | ")
    }

    const messages = [
      { role: "system", content: "You are a summarizer: keep short, clear memory of recent chat for sales context." },
      { role: "user", content: `Current memory: ${intermediateMemory || "none"}` },
      { role: "user", content: `New user message: ${userPrompt}` },
      { role: "assistant", content: `AI reply: ${aiMessage?.content || ""}` },
    ]

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.6, max_tokens: 100 }),
    })

    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content
    return summary?.trim() || intermediateMemory
  } catch {
    return intermediateMemory
  }
}
