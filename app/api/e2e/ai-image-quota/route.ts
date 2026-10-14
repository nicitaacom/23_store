import { NextResponse } from "next/server"

import { getRunOwnedUser } from "@/libs/e2e/runAccount"
import { prepareAIImageQuotaBoundaryForRun, readAIImageQuota } from "@/libs/ai/imageGenerationQuota"

export const runtime = "nodejs"

// eslint-disable-next-line local-rules/no-banned-words -- Required HTTP protocol directive for private provider state.
const noStoreHeaders = { "cache-control": "no-store" }

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "The run-owned image allowance request could not be read." }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "The run-owned image allowance request is incomplete." }, { status: 400 })
  }

  const { action, runId } = body as { action?: unknown; runId?: unknown }
  if (action !== "snapshot" && action !== "prepare-cycle-boundary") {
    return NextResponse.json({ error: "Choose a supported run-owned image allowance action." }, { status: 400 })
  }

  try {
    const getRunOwnedUserResp = await getRunOwnedUser(request, runId)
    if ("response" in getRunOwnedUserResp) return getRunOwnedUserResp.response

    const quotaResp = action === "prepare-cycle-boundary"
      ? await prepareAIImageQuotaBoundaryForRun(getRunOwnedUserResp.user.id)
      : await readAIImageQuota(getRunOwnedUserResp.user.id)

    return NextResponse.json({ success: true, ...quotaResp }, {
      headers: { ...noStoreHeaders, "x-application-request-id": requestId },
    })
  } catch (error) {
    console.error("[e2e-ai-image-quota] run-owned quota operation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return NextResponse.json({ error: "The run-owned image allowance could not be checked." }, {
      status: 503,
      headers: { ...noStoreHeaders, "x-application-request-id": requestId },
    })
  }
}
