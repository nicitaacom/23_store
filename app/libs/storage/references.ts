import type { TBuckets } from "@/ts/types/TBuckets"
import type { TStorageProviderName, TStorageReference } from "@/ts/storage"

export const STORAGE_BUCKETS: readonly TBuckets[] = [
  "23_product-images", "23_ai-product-images", "23_avatar-images", "23_support-images",
  "23_support-guest-images", "23_product-personalization-images",
]

export function isStorageBucket(bucket: unknown): bucket is TBuckets {
  return typeof bucket === "string" && STORAGE_BUCKETS.includes(bucket as TBuckets)
}

export function isStoragePath(path: unknown): path is string {
  return typeof path === "string" && new TextEncoder().encode(path).length <= 900 &&
    !/[\\\u0000-\u001f\u007f]/.test(path) && path.split("/").every(part => !!part && part !== "." && part !== "..")
}

function storageOrigin(value: string | undefined): URL | null {
  try {
    const url = new URL(value ?? "")
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash ? url : null
  } catch { return null }
}

export function resolveStorageReference(
  value: unknown,
  origins = { supabase: process.env.NEXT_PUBLIC_SUPABASE_URL, r2: process.env.NEXT_PUBLIC_R2_PUBLIC_URL },
): TStorageReference | null {
  if (typeof value !== "string") return null
  try {
    // Reject dot components before URL normalization could change the original key.
    const originalPath = value.split(/[?#]/, 1)[0].replace(/^[a-z]+:\/\/[^/]+/i, "")
    if (originalPath.split("/").some(part => [".", ".."].includes(decodeURIComponent(part)))) return null
    const url = new URL(value)
    if (url.username || url.password) return null
    for (const provider of ["supabase", "r2"] as const) {
      const origin = storageOrigin(origins[provider])
      if (!origin || url.origin !== origin.origin) continue
      const prefix = `${origin.pathname.replace(/\/$/, "")}${provider === "supabase" ? "/storage/v1/object/public" : ""}/`
      if (!url.pathname.startsWith(prefix)) continue
      // Decode each component separately: encoded separators have no valid key representation here.
      const parts = url.pathname.slice(prefix.length).split("/").map(part => decodeURIComponent(part))
      if (parts.some(part => part.includes("/") || part.includes("\\"))) return null
      const bucket = parts.shift()
      const path = parts.join("/")
      return isStorageBucket(bucket) && isStoragePath(path) ? { provider, bucket, path } : null
    }
  } catch { return null }
  return null
}

export function storagePublicUrl(provider: TStorageProviderName, bucket: TBuckets, path: string): string {
  if (!isStorageBucket(bucket) || !isStoragePath(path)) throw new Error("Invalid storage reference")
  const origin = storageOrigin(provider === "r2" ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL : process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!origin) throw new Error(`${provider} public storage origin is not configured`)
  const prefix = provider === "supabase" ? "/storage/v1/object/public" : ""
  return `${origin.href.replace(/\/$/, "")}${prefix}/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`
}
