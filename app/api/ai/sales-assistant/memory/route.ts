import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"

import { persistConversationTurn, updateWorkingMemory } from "@/libs/ai/chatMemory"

export async function POST(req: Request) {
  let requestBody: API.AISalesAssistantMemoryRequest | null = null

  try {
    requestBody = (await req.json()) as API.AISalesAssistantMemoryRequest
  } catch {
    return NextResponse.json({ error: "The conversation update could not be read. Contact the store owner if your chat history is incomplete." }, { status: 400 })
  }

  if (
    typeof requestBody.userPrompt !== "string" ||
    typeof requestBody.assistantReply !== "string" ||
    typeof requestBody.memory !== "string"
  ) {
    return NextResponse.json({ error: "The conversation update is incomplete. Send the message again from the chat." }, { status: 400 })
  }

  try {
    const { userPrompt, assistantReply, memory } = requestBody

    const supabase = createRouteHandlerClient(
      { cookies },
      { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updateWorkingMemoryResp = await updateWorkingMemory({
      currentMemory: memory,
      userPrompt,
      assistantReply,
    })

    const persistence = await persistConversationTurn({
      userId: user.id,
      userPrompt,
      assistantReply,
      memorySummary: updateWorkingMemoryResp,
    })

    const routeResponse = NextResponse.json({
      memory: updateWorkingMemoryResp,
      warnings: persistence.warnings,
    } as API.AISalesAssistantMemoryResponse)
    routeResponse.headers.set("x-openai-embedding-attempt-count", String(persistence.attemptCount))
    if (persistence.requestIds.length) {
      routeResponse.headers.set("x-openai-embedding-request-ids", JSON.stringify(persistence.requestIds))
    }
    return routeResponse
  } catch {
    return NextResponse.json(
      {
        error: "Conversation memory could not be updated. Your reply is still visible, but saved history may be incomplete. Contact the store owner if this continues.",
        memory: requestBody?.memory ?? "",
      } as API.AISalesAssistantMemoryResponse,
      { status: 503 },
    )
  }
}
