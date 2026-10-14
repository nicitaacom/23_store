import { NextResponse } from "next/server"

import { clearRunOwnedAIImageQuota } from "@/libs/ai/imageGenerationQuota"
import { clearRunOwnedConversationMemory, readRunOwnedConversationMemory } from "@/libs/ai/chatMemory"
import { getRunOwnedUser } from "@/libs/e2e/runAccount"

export const runtime = "nodejs"
// eslint-disable-next-line local-rules/no-banned-words -- Required HTTP protocol directive for private provider state.
const noStoreHeaders = { "cache-control": "no-store" }

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "The AI memory request could not be read." }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "The AI memory request is incomplete." }, { status: 400 })
  }

  const { action, runId } = body as { action?: unknown; runId?: unknown }
  if (action !== "snapshot" && action !== "clear" && action !== "clear-image-quota") {
    return NextResponse.json({ error: "Choose a supported AI state action." }, { status: 400 })
  }

  try {
    const getRunOwnedUserResp = await getRunOwnedUser(request, runId)
    if ("response" in getRunOwnedUserResp) return getRunOwnedUserResp.response
    if (action === "clear-image-quota") {
      const clearImageQuotaResp = await clearRunOwnedAIImageQuota(getRunOwnedUserResp.user.id)
      return NextResponse.json({ success: true, ...clearImageQuotaResp }, { headers: { ...noStoreHeaders, "x-application-request-id": requestId } })
    }
    if (action === "clear") {
      const clearMemoryResp = await clearRunOwnedConversationMemory(getRunOwnedUserResp.user.id)
      return NextResponse.json({ success: true, ...clearMemoryResp }, { headers: { ...noStoreHeaders, "x-application-request-id": requestId } })
    }
    const memorySnapshotResp = await readRunOwnedConversationMemory(getRunOwnedUserResp.user.id)
    return NextResponse.json(memorySnapshotResp, {
      headers: { ...noStoreHeaders, "x-application-request-id": requestId },
    })
  } catch (error) {
    console.error("[e2e-ai-memory] provider readback failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.json({ error: "The run-owned AI memory could not be checked." }, { status: 503, headers: { "x-application-request-id": requestId } })
  }
}
