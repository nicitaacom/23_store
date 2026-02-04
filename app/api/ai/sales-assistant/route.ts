import { NextRequest, NextResponse } from "next/server"

type Message = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  try {
    const { promptValue, memory, conversationHistory = [] } = (await req.json()) as API.AISalesAssistantRequest

    // don't use last messages - that's the reason I use memory - to simplify it to don't paste 10000 symbols into AI
    // actually use it for cases AI list 1-5 products or ask a question - so AI don't get confused
    const lastTwoMessages = conversationHistory.slice(-4).map(msg => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text,
    })) as Message[]

    const systemPrompt = `You are a RELENTLESS SALES ASSISTANT for Joki e-commerce.

Memory: ${memory || "none"}

LANGUAGE: Always match user's language from their LAST message.

CONVERSATION FLOW:
1. Vague request → List 3-5 specific products (Name - Price - Benefit)
2. User says "no/ei/нет" → Ask what specifically they want (color? price range? type? purpose?)
3. User clarifies → List NEW products matching their criteria
4. User confirms → Call addProductToCart
5. Track suggested products in memory to avoid repeating

FUNCTION TRIGGERS:
"add to cart", "buy", "purchase", "lisää", "osta", "добавь" → Call addProductToCart with product details

CORE RULES:
- Never refuse requests — always suggest alternatives
- Never repeat same products twice — use memory to track
- If user rejects suggestions → ask specific questions (budget? category? purpose?)
- Lead with products for vague requests
- Lead with questions when user rejects products
- Keep responses 2-4 sentences max

CONTEXT AWARENESS:
- Check memory for previously suggested products
- If products already shown → don't repeat them
- If user says "no" → ask what's wrong (too expensive? wrong type? different need?)
- Adapt suggestions based on rejection reasons

EXAMPLE FLOW:
User: "jotain paremman näköistä"
AI: [Lists 5 products]

User: "ei"
AI: "Oliko hinta liian korkea, vai etsitkö jotain tiettyä tuotetyyppiä? Kerro mitä haluaisit, niin löydän parempia vaihtoehtoja."

User: "halvempia"
AI: [Lists 5 DIFFERENT cheaper products]
`

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...lastTwoMessages,
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
