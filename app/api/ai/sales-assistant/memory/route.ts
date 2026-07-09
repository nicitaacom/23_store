import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { persistConversationTurn, updateWorkingMemory } from "@/libs/ai/chatMemory"

export async function POST(req: Request) {
  let requestBody: API.AISalesAssistantMemoryRequest | null = null

  try {
    requestBody = (await req.json()) as API.AISalesAssistantMemoryRequest
    const { userPrompt, assistantReply, memory } = requestBody

    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updatedMemory = await updateWorkingMemory({
      currentMemory: memory,
      userPrompt,
      assistantReply,
    })

    await persistConversationTurn({
      userId: user.id,
      userPrompt,
      assistantReply,
      memorySummary: updatedMemory,
    })

    return NextResponse.json({
      memory: updatedMemory,
    } as API.AISalesAssistantMemoryResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        error: errorMessage,
        memory: requestBody?.memory ?? "",
      } as API.AISalesAssistantMemoryResponse,
      { status: 400 },
    )
  }
}
