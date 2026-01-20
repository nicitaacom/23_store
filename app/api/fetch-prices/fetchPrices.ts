// fetchPrices.ts
import { exec as execCb } from "child_process"
import { promisify } from "util"

type PriceResult = { price: number; stripeAmount: number; sourcePrices: number[] }

const exec = promisify(execCb)
const MAX_CLEAN_LENGTH = 20000
const FETCH_TIMEOUT = 6000 // ms
const USER_AGENT = "Mozilla/5.0 (compatible; PriceBot/1.0; +https://example.com)"

// clamp helper
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function htmlToCleanText(html: string, maxLength = MAX_CLEAN_LENGTH): string {
  if (!html) return ""
  let clean = html
    .replace(/&nbsp;/g, " ")
    .replace(/&(amp|lt|gt|quot|#39);/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[REMOVED_INLINE_IMAGE\]/g, " ")
    .replace(/[^\w\s.,!?@#$%^&*()\-+=:;'"<>{}[\]\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return clean.length > maxLength ? clean.substring(0, maxLength) + "..." : clean
}

// server-side: use curl (child_process) to fetch raw HTML (avoids CORS)
async function fetchHtmlWithCurl(url: string): Promise<string> {
  // This must run on server only.
  const maxSeconds = Math.max(1, Math.ceil(FETCH_TIMEOUT / 1000))
  // use --compressed to accept compressed responses, -sS for silent but show errors
  const cmd = `curl -sS -A "${USER_AGENT}" --compressed --max-time ${maxSeconds} "${url}"`
  const { stdout } = await exec(cmd, { timeout: FETCH_TIMEOUT })
  return String(stdout || "")
}

// fetch Google search HTML and extract up to topN unique prices (USD/EUR)
export async function fetchPricesRaw(query: string, topN = 5): Promise<number[]> {
  try {
    // server-only guard
    if (typeof window !== "undefined") {
      throw new Error("fetchPricesRaw must be run on server (Node).")
    }

    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    const html = await fetchHtmlWithCurl(url)
    if (!html) return []

    const cleanText = htmlToCleanText(html)
    const matches = cleanText.match(/[$€]\s?[0-9]+(\.[0-9]{1,2})?/g) || []
    const prices = matches.map(m => parseFloat(m.replace(/[$€\s]/g, ""))).filter(n => Number.isFinite(n) && n > 0)

    const uniqueSorted = Array.from(new Set(prices)).sort((a, b) => a - b)
    return uniqueSorted.slice(0, topN)
  } catch (error) {
    // keep errors quiet but log on server
    console.error("fetchPricesRaw failed:", error instanceof Error ? error.message : error)
    return []
  }
}

function detectRange(title: string, subtitle: string) {
  const text = `${title} ${subtitle}`.toLowerCase()
  if (/adapter|connector|plug|jack|dc\s?jack|dc-connector|converter/.test(text)) return { min: 1, max: 6 }
  if (/cable|lead|wire|cord/.test(text)) return { min: 1, max: 8 }
  if (/12v|battery|power|psu|power supply/.test(text)) return { min: 4, max: 15 }
  if (/socks|heated sock|heated socks/.test(text)) return { min: 2, max: 20 }
  return { min: 2, max: 25 }
}

function derivePriceFromSources(sourcePrices: number[], title: string, subtitle: string): number {
  const { min, max } = detectRange(title, subtitle)
  if (!sourcePrices || sourcePrices.length === 0) {
    const fallback = Math.round((min + Math.min(max, min + 3)) * 100) / 100
    return clamp(fallback, min, max)
  }

  const sorted = [...sourcePrices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const p25 = sorted[Math.max(0, Math.floor(sorted.length * 0.25))]
  const candidate = median || p25 || sorted[0]
  const adjusted = Math.round(candidate * 100) / 100
  return clamp(adjusted, min, max)
}

// main helper: returns price in USD and stripeAmount (cents)
export async function getRealisticPrice(
  title: string,
  subTitle: string,
  options?: { preferSource?: "google" | "ebay" | "aliexpress"; topN?: number },
): Promise<PriceResult> {
  // server-only guard
  if (typeof window !== "undefined") {
    throw new Error("getRealisticPrice must be run on server (Node).")
  }

  const topN = options?.topN ?? 5
  const query = `${title} ${subTitle}`.trim() || title
  const sourcePrices = await fetchPricesRaw(query, topN)

  const price = derivePriceFromSources(sourcePrices, title, subTitle)
  const normalized = Math.round(price * 100) / 100
  const stripeAmount = Math.max(1, Math.round(normalized * 100))

  return { price: normalized, stripeAmount, sourcePrices }
}
