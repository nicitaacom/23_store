import { NextRequest, NextResponse } from "next/server"

type Message = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  try {
    const { promptValue, memory } = (await req.json()) as API.AISalesAssistantRequest

    // don't use last messages - that's the reason I use memory - to simplify it to don't paste 10000 symbols into AI
    // const lastMessages = conversationHistory.slice(-4).map(msg => ({
    //   role: msg.role === "ai" ? "assistant" : "user",
    //   content: msg.text,
    // })) as Message[]

    const systemPrompt = `You are a RELENTLESS SALES ASSISTANT for 23_store e-commerce.

Memory: ${memory || "none"}

CRITICAL FUNCTION CALL RULES:
- When user says "add to cart", "buy it", "purchase", "yes add it" → IMMEDIATELY call addProductToCart
- Extract product details FROM MEMORY if available
- If memory mentions a product with price, use that for the function call
- DO NOT ask for confirmation if product details are in memory — just add it
- Only ask for clarification if memory is completely empty

RULES:
- NEVER say "we don't have this", "I can't help", or any refusal.
- ALWAYS suggest 1–2 purchasable products, compatible alternatives, or workarounds.
- ONLY mention support in the bottom-left corner as a LAST RESORT if the request is illegal or truly impossible.
- Clarify vague requests politely, then immediately offer purchasable options.
- Use addProductToCart whenever the user wants a product.
- Replies must be persuasive, short (≤2 sentences), and guide toward purchase.
- Be CREATIVE: if exact product doesn't exist, suggest equivalent or complementary items.
- NEVER leave the user empty-handed unless the request is illegal.
- Respond strictly in the SAME LANGUAGE as the last user message.
- always try to understand the goal behind the user request.
- If the user asks about an item vaguely, first identify why they need it.  

EXAMPLES:
User: "Add it to cart" (Memory: hair removal product $149)
Assistant: *calls addProductToCart with hair removal product details*

User: "штуку которую вставляешь в батарейку"
Assistant: "Вы ищете заглушку или декоративный клапан для батареи? Я могу показать несколько подходящих вариантов, которые легко купить."

User: "I don't know the name"
Assistant: "It might be a protective cap or a valve for the radiator. Do you want me to suggest purchasable options?"
`

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptValue },
    ]

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
                title: { type: "string", description: "Product name with size/color" },
                subtitle: { type: "string", description: "Material, features, description" },
                price: { type: "number", description: "Price in USD" },
              },
              required: ["title", "subtitle", "price"],
            },
            quantity: { type: "number", default: 1, description: "Number of items" },
            note: { type: "string", description: "Optional customer note" },
          },
          required: ["product"],
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
    console.log(103, "OpenAI firstChoice:", { firstChoice })

    const updatedMemory = await updateMemoryFn(memory, promptValue, aiMessage)

    return NextResponse.json({ openai: openaiData, memory: updatedMemory } as API.AISalesAssistantResponse)
  } catch (error) {
    return NextResponse.json({
      reply: error instanceof Error ? error.message : String(error),
      memory: "",
    })
  }
}

// add just currently added product to memory to don't waste tokens on just adding a new product
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 100,
      }),
    })

    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content
    return summary?.trim() || intermediateMemory
  } catch {
    return intermediateMemory
  }
}
