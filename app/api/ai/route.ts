import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { promptValue, memory } = (await req.json()) as {
      promptValue: string
      memory: string
    }

    // 1. First AI call - Generate response based on memory
    const chatMessages = [
      {
        role: "system",
        content: `You are a sales assistant for 23_store e-commerce platform. Help customers find and buy products.

${memory ? `Context: ${memory}` : ""}

Rules:
- Keep responses under 2 sentences
- For vague questions, ask what product they're looking for
- For customization details (images, placement, etc), direct to support chat in bottom right
- Focus on product discovery and purchase
- Ask 1 specific question to narrow options (size, color, budget)
- For custom orders: explain they send image/details to support → agree on design → place order → pay`,
      },
      { role: "user", content: promptValue },
    ]

    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    const chatData = await chatResponse.json()
    const aiReply = chatData?.choices?.[0]?.message?.content || "Sorry, I couldn&apos;t generate a reply."

    const memoryMessages = [
      {
        role: "system",
        content: `Track what user wants to buy. Keep under 20 words.

Current: "${memory || "none"}"
User: "${promptValue}"
AI: "${aiReply}"

Rules:
- If user answers AI's question about existing product, ADD detail to current memory
- Only return "none" for greetings (hey, hi, hello) or completely off-topic
- Single word/short answers like "L", "blue", "yes" are adding details to current product
- Format: "wants [product + all details]"

Examples:
Current: "wants blue t-shirt with car image"
User: "L"
Return: "wants blue L t-shirt with car image"

Current: "wants headphones"
User: "wireless under $100"
Return: "wants wireless headphones under $100"

Return memory only.`,
      },
      { role: "user", content: "Memory?" },
    ]

    const memoryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: memoryMessages,
        temperature: 0.5,
        max_tokens: 100,
      }),
    })

    const memoryData = await memoryResponse.json()
    const updatedMemory = memoryData?.choices?.[0]?.message?.content || memory

    // 3. Return both response and updated memory
    return NextResponse.json({ reply: aiReply, memory: updatedMemory })
  } catch (error) {
    return NextResponse.json({
      reply: "Error: " + (error instanceof Error ? error.message : String(error)),
      memory: "",
    })
  }
}
