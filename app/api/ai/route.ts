import { NextRequest, NextResponse } from "next/server"

type Message = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  try {
    const {
      promptValue,
      memory,
      conversationHistory = [],
    } = (await req.json()) as {
      promptValue: string
      memory: string
      conversationHistory: Array<{ role: "user" | "ai"; text: string }>
    }

    const lastThreeMessages = conversationHistory.slice(-6).map(msg => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text,
    })) as Message[]

    const systemPrompt = `You are a sales assistant for 23_store e-commerce platform.

${memory ? `Recently added: ${memory}` : ""}

Rules:
- ALWAYS use "addProductToCart" function when user asks to add products
- Create detailed product objects with title, subtitle, and price
- For price: estimate realistic USD prices based on product type (T-shirts: $15-30, Hoodies: $35-60, etc.)
- For subtitle: describe material, color, features (e.g., "100% cotton, no logos, classic fit")
- If user says "add one more" or "add again", use the LAST product from context
- Don't ask for size/color unless user mentions it
- Keep text responses under 2 sentences

Examples:
User: "Add a black T-shirt L size"
→ addProductToCart({
  title: "Black T-shirt L size",
  subtitle: "100% cotton, no logos, classic fit",
  price: 24.99
}, 1)

User: "Add 3 red hoodies"
→ addProductToCart({
  title: "Red hoodie",
  subtitle: "Warm fleece, adjustable hood, kangaroo pocket",
  price: 49.99
}, 3)`

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...lastThreeMessages,
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
        temperature: 0.6,
      }),
    })

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text()
      return NextResponse.json({ error: text }, { status: openaiResponse.status })
    }

    const openaiData = await openaiResponse.json()
    console.log(103, "OpenAI response:", openaiData.choices[0].message)

    const updatedMemory = updateMemoryFn(memory, promptValue, openaiData.choices?.[0]?.message)

    return NextResponse.json({ openai: openaiData, memory: updatedMemory } as API.AIResponse)
  } catch (error) {
    return NextResponse.json({
      reply: error instanceof Error ? error.message : String(error),
      memory: "",
    })
  }
}

// add just currently added product to memory to don't waste tokens on just adding a new product
function updateMemoryFn(currentMemory: string, userPrompt: string, aiMessage: any): string {
  const functionCall = aiMessage?.function_call

  if (functionCall?.name === "addProductToCart") {
    try {
      const args = JSON.parse(functionCall.arguments || "{}")
      const product = args.product
      const quantity = args.quantity || 1

      if (!product?.title) return currentMemory

      const memoryItems = currentMemory ? currentMemory.split(" | ") : []
      const newItem = quantity > 1 ? `${quantity}x ${product.title}` : product.title

      memoryItems.push(newItem)

      return memoryItems.slice(-3).join(" | ")
    } catch {
      return currentMemory
    }
  }

  return currentMemory
}
