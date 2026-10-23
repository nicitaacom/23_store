import { readdir, rm, stat } from "node:fs/promises"
import path from "node:path"

export const MONTHLY_CRON = "23 3 1 * *"
export const MONTHLY_TIMEOUT_MS = 60 * 60 * 1000
export const ARTIFACT_KEEP_MS = 14 * 24 * 60 * 60 * 1000
const KEPT_FILE_NAMES = new Set(["monthly-window.json"])

export function isMonthlyFireMinute(now) {
  return now.getUTCDate() === 1 && now.getUTCHours() === 3 && now.getUTCMinutes() === 23
}

export function nextMonthlyFire(now) {
  let candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 3, 23, 0, 0))
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 3, 23, 0, 0))
  }
  return candidate
}

export function decideMonthlyFire({ now, lockStartedAt = null, lastWindowId = null }) {
  if (!isMonthlyFireMinute(now)) return { action: "wait" }
  const windowId = now.toISOString().slice(0, 7)
  if (lastWindowId === windowId) return { action: "skip", reason: "already-fired", windowId }
  if (lockStartedAt != null && now.getTime() - lockStartedAt < MONTHLY_TIMEOUT_MS) {
    return { action: "skip", reason: "in-progress", windowId }
  }
  return { action: "run", windowId }
}

export async function pruneOldFiles(directory, nowMs, keepMs = ARTIFACT_KEEP_MS) {
  let removed = 0
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      removed += await pruneOldFiles(fullPath, nowMs, keepMs)
      continue
    }
    if (KEPT_FILE_NAMES.has(entry.name)) continue
    const info = await stat(fullPath)
    if (nowMs - info.mtimeMs > keepMs) {
      await rm(fullPath)
      removed += 1
    }
  }
  return removed
}
