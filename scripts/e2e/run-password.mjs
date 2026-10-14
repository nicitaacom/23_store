import { createHmac } from "node:crypto"

export function deriveRunTestPassword(serviceRoleKey, runId) {
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey || typeof runId !== "string" || !runId) {
    throw new Error("Run-owned account passwords require the Supabase service key and exact run id")
  }

  const digest = createHmac("sha256", serviceRoleKey)
    .update(`23-store-e2e-account-password:${runId}`)
    .digest("base64url")
  return `Store-E2E-${digest}-7!`
}
