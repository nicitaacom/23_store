import "server-only"

import { Pinecone, type Index } from "@pinecone-database/pinecone"
import { Redis } from "@upstash/redis"

import type { TAIChatMessage } from "@/ts/types/TAIChatMessage"

const RECENT_HISTORY_LIMIT = 10
const RECENT_HISTORY_PROMPT_LIMIT = 4
const RECENT_HISTORY_TTL_SECONDS = 60 * 60 * 24 * 30
const SEMANTIC_TOP_K = 4
const SEMANTIC_CONTEXT_CHAR_LIMIT = 420
const EMBEDDING_INPUT_CHAR_LIMIT = 4000
const MEMORY_FACT_LIMIT = 7
const MEMORY_ITEM_CHAR_LIMIT = 140
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
const LARGE_EMBEDDING_MODEL = "text-embedding-3-large"
const WORKING_MEMORY_LABELS = [
  "Language",
  "Product interests",
  "Budget",
  "Rejected items",
  "Saved preferences",
  "Cart actions",
  "Recent references",
  "Promised follow-ups",
] as const
const NONE_VALUE = "None"
const GENERIC_MEMORY_VALUES = new Set(["none", "unknown", "n/a", "null"])
const STOPWORDS = new Set([
  "a",
  "about",
  "again",
  "all",
  "also",
  "an",
  "and",
  "another",
  "any",
  "are",
  "can",
  "cheapest",
  "cheap",
  "color",
  "could",
  "do",
  "does",
  "for",
  "from",
  "give",
  "good",
  "have",
  "help",
  "here",
  "how",
  "i",
  "im",
  "it",
  "its",
  "just",
  "know",
  "like",
  "lights",
  "light",
  "look",
  "looking",
  "more",
  "need",
  "new",
  "of",
  "ok",
  "okay",
  "on",
  "one",
  "option",
  "options",
  "or",
  "please",
  "product",
  "products",
  "recommend",
  "same",
  "show",
  "something",
  "suggest",
  "suggestion",
  "suggestions",
  "tell",
  "than",
  "that",
  "the",
  "them",
  "this",
  "those",
  "under",
  "want",
  "what",
  "with",
  "would",
  "you",
])
const REFERENTIAL_PROMPT_PATTERN =
  /\b(it|this|that|they|them|those|these|again|another|same|also|still|previous|earlier|more|cheaper|cheapest|other|option|options|what about)\b/i

type AssistantRole = "user" | "assistant"
type WorkingMemoryKey =
  | "Language"
  | "Product interests"
  | "Budget"
  | "Rejected items"
  | "Saved preferences"
  | "Cart actions"
  | "Recent references"
  | "Promised follow-ups"

type RecentHistoryMessage = {
  role: AssistantRole
  text: string
  createdAt: string
}

export type AssistantConversationMessage = {
  role: AssistantRole
  content: string
}

type RecentMessageSource = "upstash" | "browser-fallback" | "merged"

export type SalesAssistantDebugContext = {
  semanticContext: string
  recentMessages: AssistantConversationMessage[]
  recentSource: RecentMessageSource
  pineconeMatches: Array<{
    kind: "message"
    role: AssistantRole
    text: string
  }>
}

type MemoryRecordMetadata = {
  text: string
  role: AssistantRole
  kind: "message"
  createdAt: number
}

type UpdateWorkingMemoryParams = {
  currentMemory: string
  userPrompt: string
  assistantReply?: string
  semanticContext?: string
}

type PersistConversationTurnParams = {
  userId: string
  userPrompt: string
  assistantReply: string
  memorySummary: string
}

type GetSalesAssistantContextParams = {
  userId: string
  promptValue: string
  memory: string
  conversationHistory: TAIChatMessage[]
}

let redisClient: Redis | null = null
let pineconeClient: Pinecone | null = null
let pineconeIndex: Index<MemoryRecordMetadata> | null = null
let embeddingModelPromise: Promise<typeof DEFAULT_EMBEDDING_MODEL | typeof LARGE_EMBEDDING_MODEL> | null = null

type WorkingMemoryState = Record<WorkingMemoryKey, string[]>

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? ""
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function uniqueCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>()

  return items.filter(item => {
    const normalizedItem = item.toLowerCase()
    if (seen.has(normalizedItem)) return false
    seen.add(normalizedItem)
    return true
  })
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

function createEmptyWorkingMemory(): WorkingMemoryState {
  return {
    Language: [],
    "Product interests": [],
    Budget: [],
    "Rejected items": [],
    "Saved preferences": [],
    "Cart actions": [],
    "Recent references": [],
    "Promised follow-ups": [],
  }
}

function parseMemoryValues(value: string): string[] {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue || GENERIC_MEMORY_VALUES.has(normalizedValue.toLowerCase())) return []

  return uniqueCaseInsensitive(
    normalizedValue
      .split(",")
      .map(part => clipText(normalizeText(part), MEMORY_ITEM_CHAR_LIMIT))
      .filter(Boolean),
  )
}

function parseWorkingMemory(memory: string): WorkingMemoryState {
  const workingMemory = createEmptyWorkingMemory()

  memory
    .split("|")
    .map(part => normalizeText(part))
    .filter(Boolean)
    .forEach(part => {
      const separatorIndex = part.indexOf(":")
      if (separatorIndex === -1) return

      const rawKey = normalizeText(part.slice(0, separatorIndex)) as WorkingMemoryKey
      const rawValue = part.slice(separatorIndex + 1)

      if (!WORKING_MEMORY_LABELS.includes(rawKey)) return

      workingMemory[rawKey] = parseMemoryValues(rawValue)
    })

  return workingMemory
}

function serializeWorkingMemory(memory: WorkingMemoryState): string {
  return WORKING_MEMORY_LABELS.slice(0, MEMORY_FACT_LIMIT + 1)
    .map(label => `${label}: ${memory[label].length ? memory[label].join(", ") : NONE_VALUE}`)
    .join(" | ")
}

function pushMemoryValues(memory: WorkingMemoryState, key: WorkingMemoryKey, values: string[], limit = 4): void {
  const nextValues = uniqueCaseInsensitive(
    [...memory[key], ...values.map(value => clipText(normalizeText(value), MEMORY_ITEM_CHAR_LIMIT)).filter(Boolean)].filter(Boolean),
  )

  memory[key] = nextValues.slice(-limit)
}

function inferLanguage(text: string): string | null {
  if (!text) return null
  if (/[А-Яа-яЁё]/.test(text)) return "Russian"
  if (/\b(hei|moi|mitä|haluan|haluaisin|lisää|osta|valo|valot|ei|kyllä)\b/i.test(text)) return "Finnish"
  return "English"
}

function extractMoneyValues(text: string): string[] {
  return uniqueCaseInsensitive(
    Array.from(text.matchAll(/(?:[$€£]\s?\d+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?\s?(?:usd|eur|euro|dollars?|bucks))/gi))
      .map(match => normalizeText(match[0].replace(/\s+/g, ""))),
  )
}

function extractPreferenceHints(text: string): string[] {
  const preferences: string[] = []
  const normalizedText = text.toLowerCase()

  if (/\b(cheap|cheaper|cheapest|budget|affordable|under)\b/.test(normalizedText)) preferences.push("budget-friendly")
  if (/\b(smart)\b/.test(normalizedText)) preferences.push("smart")
  if (/\b(led)\b/.test(normalizedText)) preferences.push("LED")
  if (/\b(color|colour|rgb|warm|white|soft)\b/.test(normalizedText)) preferences.push("lighting style specified")

  return preferences
}

function normalizeKeyword(word: string): string {
  const cleanedWord = word.toLowerCase().replace(/[^a-z]/g, "")
  if (cleanedWord.endsWith("ies") && cleanedWord.length > 4) return `${cleanedWord.slice(0, -3)}y`
  if (cleanedWord.endsWith("s") && cleanedWord.length > 4) return cleanedWord.slice(0, -1)
  return cleanedWord
}

function extractInterestKeywords(text: string): string[] {
  const rawWords = Array.from(text.matchAll(/[A-Za-z]{3,}/g)).map(match => match[0])
  const keywords = rawWords
    .map(normalizeKeyword)
    .filter(word => word && !STOPWORDS.has(word))
    .map(word => titleCase(word))

  return uniqueCaseInsensitive(keywords).slice(-3)
}

function extractReferenceTitles(text: string): string[] {
  const boldMatches = Array.from(text.matchAll(/\*\*([^*]{2,80}?)\*\*/g)).map(match => normalizeText(match[1]))
  const numberedMatches = Array.from(text.matchAll(/(?:^|\n|\d+\.\s)([A-Z][A-Za-z0-9/&,' -]{2,80}?)(?:\s*-\s*(?:[$€£]\d|\d)|:)/g)).map(match =>
    normalizeText(match[1]),
  )

  return uniqueCaseInsensitive([...boldMatches, ...numberedMatches]).slice(-4)
}

function isRejectionPrompt(text: string): boolean {
  return /\b(no|nope|nah|not this|dont want|don't want|ei|нет)\b/i.test(text)
}

function extractPromisedFollowUps(text: string): string[] {
  if (!text) return []
  if (/\blet me know\b/i.test(text)) return ["awaiting user choice"]
  if (/\bwould you like\b/i.test(text)) return ["awaiting confirmation"]
  return []
}

function updateWorkingMemoryDeterministically({
  currentMemory,
  userPrompt,
  assistantReply = "",
}: UpdateWorkingMemoryParams): string {
  const workingMemory = parseWorkingMemory(currentMemory)
  const inferredLanguage = inferLanguage(userPrompt)

  if (inferredLanguage) workingMemory.Language = [inferredLanguage]

  pushMemoryValues(workingMemory, "Budget", extractMoneyValues(userPrompt), 2)
  pushMemoryValues(workingMemory, "Saved preferences", extractPreferenceHints(userPrompt), 4)
  pushMemoryValues(workingMemory, "Product interests", extractInterestKeywords(userPrompt), 4)

  const assistantReferences = extractReferenceTitles(assistantReply)
  pushMemoryValues(workingMemory, "Recent references", assistantReferences, 4)

  if (assistantReferences.length) {
    pushMemoryValues(workingMemory, "Product interests", assistantReferences.map(reference => titleCase(reference)), 4)
  }

  if (isRejectionPrompt(userPrompt)) {
    pushMemoryValues(workingMemory, "Rejected items", workingMemory["Recent references"].slice(-2), 4)
  }

  if (/\badded\b.*\bcart\b/i.test(assistantReply) || /\badd to cart\b/i.test(userPrompt)) {
    pushMemoryValues(
      workingMemory,
      "Cart actions",
      workingMemory["Recent references"].length ? workingMemory["Recent references"].slice(-1) : ["cart updated"],
      3,
    )
  }

  workingMemory["Promised follow-ups"] = extractPromisedFollowUps(assistantReply)

  return serializeWorkingMemory(workingMemory)
}

function normalizeWorkingMemory(memory: string): string {
  const normalizedMemory = normalizeText(memory.replace(/^memory:\s*/i, "").replace(/\n+/g, " | "))

  if (!normalizedMemory) return ""

  const items = normalizedMemory
    .split("|")
    .map(item => clipText(normalizeText(item), MEMORY_ITEM_CHAR_LIMIT))
    .filter(Boolean)

  return uniqueCaseInsensitive(items).slice(-MEMORY_FACT_LIMIT).join(" | ")
}

function buildFallbackMemory({ currentMemory, userPrompt, assistantReply }: UpdateWorkingMemoryParams): string {
  const memoryItems = currentMemory
    ? currentMemory
        .split("|")
        .map(item => clipText(normalizeText(item), MEMORY_ITEM_CHAR_LIMIT))
        .filter(Boolean)
    : []

  const nextItems = uniqueCaseInsensitive(
    [...memoryItems, clipText(normalizeText(userPrompt), MEMORY_ITEM_CHAR_LIMIT), clipText(normalizeText(assistantReply), MEMORY_ITEM_CHAR_LIMIT)].filter(Boolean),
  )

  return nextItems.slice(-MEMORY_FACT_LIMIT).join(" | ")
}

function getRedisClient(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv()
  return redisClient
}

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })
  }

  return pineconeClient
}

function getPineconeHost(): string | undefined {
  return process.env.PINECONE_HOST || process.env.PINECONE_ENVIRONMENT
}

function getPineconeIndex(): Index<MemoryRecordMetadata> {
  if (pineconeIndex) return pineconeIndex

  const indexOptions: { host?: string; name?: string } = {}
  const host = getPineconeHost()

  if (host) indexOptions.host = host
  if (process.env.PINECONE_INDEX) indexOptions.name = process.env.PINECONE_INDEX

  if (!indexOptions.host && !indexOptions.name) {
    throw new Error("Missing Pinecone index configuration. Set PINECONE_HOST or PINECONE_ENVIRONMENT and PINECONE_INDEX.")
  }

  pineconeIndex = getPineconeClient().index<MemoryRecordMetadata>(indexOptions)
  return pineconeIndex
}

async function getEmbeddingModel(): Promise<typeof DEFAULT_EMBEDDING_MODEL | typeof LARGE_EMBEDDING_MODEL> {
  if (!embeddingModelPromise) {
    embeddingModelPromise = (async () => {
      if (!process.env.PINECONE_INDEX) return DEFAULT_EMBEDDING_MODEL

      try {
        const indexDescription = await getPineconeClient().describeIndex(process.env.PINECONE_INDEX)
        return indexDescription.dimension === 3072 ? LARGE_EMBEDDING_MODEL : DEFAULT_EMBEDDING_MODEL
      } catch (error) {
        console.warn("Falling back to text-embedding-3-small because Pinecone index metadata could not be resolved.", error)
        return DEFAULT_EMBEDDING_MODEL
      }
    })()
  }

  return embeddingModelPromise
}

async function createEmbeddings(inputs: string[]): Promise<number[][]> {
  const cleanedInputs = inputs.map(input => clipText(normalizeText(input), EMBEDDING_INPUT_CHAR_LIMIT)).filter(Boolean)

  if (!cleanedInputs.length) return []
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.")

  const getEmbeddingModelResp = await getEmbeddingModel()

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getEmbeddingModelResp,
      input: cleanedInputs,
    }),
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }

  const embeddings = data.data?.map(item => item.embedding ?? []) ?? []

  if (!embeddings.length || embeddings.length !== cleanedInputs.length) {
    throw new Error("OpenAI embeddings response did not match the expected record count.")
  }

  return embeddings
}

function getHistoryKey(userId: string): string {
  return `ai:history:${userId}`
}

function getMemoryNamespace(userId: string): string {
  return userId
}

function toAssistantConversationMessage(message: RecentHistoryMessage): AssistantConversationMessage {
  return {
    role: message.role,
    content: normalizeText(message.text),
  }
}

function areSameConversationMessages(left: AssistantConversationMessage, right: AssistantConversationMessage): boolean {
  return left.role === right.role && left.content === right.content
}

function mergeRecentMessages(
  storedHistory: AssistantConversationMessage[],
  fallbackHistory: AssistantConversationMessage[],
): SalesAssistantDebugContext["recentMessages"] {
  if (!storedHistory.length) return fallbackHistory.slice(-RECENT_HISTORY_PROMPT_LIMIT)
  if (!fallbackHistory.length) return storedHistory.slice(-RECENT_HISTORY_PROMPT_LIMIT)

  const maxOverlap = Math.min(storedHistory.length, fallbackHistory.length)

  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    const storedTail = storedHistory.slice(-overlap)
    const fallbackHead = fallbackHistory.slice(0, overlap)

    const isOverlap = storedTail.every((message, index) => areSameConversationMessages(message, fallbackHead[index]))

    if (isOverlap) {
      return [...storedHistory, ...fallbackHistory.slice(overlap)].slice(-RECENT_HISTORY_PROMPT_LIMIT)
    }
  }

  const mergedMessages = [...storedHistory, ...fallbackHistory]

  return mergedMessages.slice(-RECENT_HISTORY_PROMPT_LIMIT)
}

function buildFallbackConversationHistory(conversationHistory: TAIChatMessage[], currentPrompt: string): AssistantConversationMessage[] {
  const fallbackHistory = [...conversationHistory]
  const lastMessage = fallbackHistory[fallbackHistory.length - 1]

  if (lastMessage?.role === "user" && normalizeText(lastMessage.text) === normalizeText(currentPrompt)) {
    fallbackHistory.pop()
  }

  return fallbackHistory
    .slice(-RECENT_HISTORY_LIMIT)
    .map(
      (message): AssistantConversationMessage => ({
        role: message.role === "ai" ? "assistant" : "user",
        content: normalizeText(message.text),
      }),
    )
    .filter(message => message.content)
}

async function readRecentHistory(userId: string): Promise<AssistantConversationMessage[]> {
  try {
    const entries = await getRedisClient().lrange<string>(getHistoryKey(userId), 0, -1)

    return entries
      .map(entry => {
        try {
          return JSON.parse(entry) as RecentHistoryMessage
        } catch {
          return null
        }
      })
      .filter((entry): entry is RecentHistoryMessage => Boolean(entry?.text && entry.role))
      .slice(-RECENT_HISTORY_LIMIT)
      .map(toAssistantConversationMessage)
      .filter(message => message.content)
  } catch (error) {
    console.error("Failed to read recent AI history from Upstash.", error)
    return []
  }
}

async function persistRecentHistory(userId: string, userPrompt: string, assistantReply: string): Promise<void> {
  const entries = [
    {
      role: "user" as const,
      text: userPrompt,
      createdAt: new Date().toISOString(),
    },
    {
      role: "assistant" as const,
      text: assistantReply,
      createdAt: new Date().toISOString(),
    },
  ].filter(entry => entry.text)

  if (!entries.length) return

  await getRedisClient()
    .pipeline()
    .rpush(
      getHistoryKey(userId),
      ...entries.map(entry => JSON.stringify(entry)),
    )
    .ltrim(getHistoryKey(userId), -RECENT_HISTORY_LIMIT, -1)
    .expire(getHistoryKey(userId), RECENT_HISTORY_TTL_SECONDS)
    .exec()
}

async function persistSemanticMemory(userId: string, userPrompt: string, assistantReply: string, memorySummary: string): Promise<void> {
  const now = Date.now()
  const records = [
    {
      id: `user:${now}:${crypto.randomUUID()}`,
      text: userPrompt,
      role: "user" as const,
      kind: "message" as const,
      createdAt: now,
    },
    {
      id: `assistant:${now}:${crypto.randomUUID()}`,
      text: assistantReply,
      role: "assistant" as const,
      kind: "message" as const,
      createdAt: now + 1,
    },
  ].filter(record => record.text && record.text.length > 8)

  if (!records.length) return

  const createEmbeddingsResp = await createEmbeddings(records.map(record => record.text))

  await getPineconeIndex()
    .namespace(getMemoryNamespace(userId))
    .upsert({
      records: records.map((record, index) => ({
        id: record.id,
        values: createEmbeddingsResp[index],
        metadata: {
          text: record.text,
          role: record.role,
          kind: record.kind,
          createdAt: record.createdAt,
        },
      })),
    })
}

export async function getRelevantSemanticContext({
  userId,
  promptValue,
  memory,
}: Pick<GetSalesAssistantContextParams, "userId" | "promptValue" | "memory">): Promise<{
  semanticContext: string
  pineconeMatches: SalesAssistantDebugContext["pineconeMatches"]
}> {
  const searchText = normalizeText([memory, promptValue].filter(Boolean).join("\n"))

  if (!searchText) return { semanticContext: "", pineconeMatches: [] }
  if (!shouldQuerySemanticMemory(promptValue, memory)) return { semanticContext: "", pineconeMatches: [] }

  try {
    const [queryEmbedding] = await createEmbeddings([searchText])
    const response = await getPineconeIndex()
      .namespace(getMemoryNamespace(userId))
      .query({
        vector: queryEmbedding,
        topK: SEMANTIC_TOP_K,
        includeMetadata: true,
      })

    const pineconeMatches: SalesAssistantDebugContext["pineconeMatches"] = []
    const seen = new Set<string>()

    for (const match of response.matches) {
      const metadata = match.metadata
      const text = clipText(normalizeText(String(metadata?.text ?? "")), 220)

      if (!text || seen.has(text.toLowerCase()) || text === normalizeText(promptValue)) continue

      pineconeMatches.push({
        kind: "message",
        role: metadata?.role === "assistant" ? "assistant" : "user",
        text,
      })
      seen.add(text.toLowerCase())

      if (pineconeMatches.length >= SEMANTIC_TOP_K) break
    }

    const summaryParts: string[] = []
    let currentLength = 0

    const currentMemoryNormalized = normalizeText(memory)

    for (const match of pineconeMatches) {
      const text = match.text

      if (!text) continue

      const line =
        match.role === "assistant" ? `Earlier suggestion: ${clipText(text, 120)}` : `Earlier user need: ${clipText(text, 120)}`

      if (summaryParts.includes(line)) continue
      if (currentLength + line.length > SEMANTIC_CONTEXT_CHAR_LIMIT) break

      summaryParts.push(line)
      currentLength += line.length + 1
    }

    return {
      semanticContext: summaryParts.join("\n"),
      pineconeMatches,
    }
  } catch (error) {
    console.error("Failed to query Pinecone semantic memory.", error)
    return { semanticContext: "", pineconeMatches: [] }
  }
}

export async function getSalesAssistantContext({
  userId,
  promptValue,
  memory,
  conversationHistory,
}: GetSalesAssistantContextParams): Promise<{
  recentMessages: AssistantConversationMessage[]
  semanticContext: string
  recentSource: RecentMessageSource
  pineconeMatches: SalesAssistantDebugContext["pineconeMatches"]
}> {
  const fallbackHistory = buildFallbackConversationHistory(conversationHistory, promptValue)
  const [storedHistory, semanticResult] = await Promise.all([
    readRecentHistory(userId),
    getRelevantSemanticContext({ userId, promptValue, memory }),
  ])

  const recentMessages = mergeRecentMessages(storedHistory, fallbackHistory)
  const recentSource =
    storedHistory.length && fallbackHistory.length
      ? "merged"
      : storedHistory.length
        ? "upstash"
        : "browser-fallback"

  return {
    recentMessages,
    semanticContext: semanticResult.semanticContext,
    recentSource,
    pineconeMatches: semanticResult.pineconeMatches,
  }
}

export async function updateWorkingMemory({
  currentMemory,
  userPrompt,
  assistantReply = "",
}: UpdateWorkingMemoryParams): Promise<string> {
  return normalizeWorkingMemory(
    updateWorkingMemoryDeterministically({
      currentMemory,
      userPrompt,
      assistantReply,
    }),
  )
}

export async function persistConversationTurn({
  userId,
  userPrompt,
  assistantReply,
  memorySummary,
}: PersistConversationTurnParams): Promise<void> {
  const normalizedUserPrompt = clipText(normalizeText(userPrompt), EMBEDDING_INPUT_CHAR_LIMIT)
  const normalizedAssistantReply = clipText(normalizeText(assistantReply), EMBEDDING_INPUT_CHAR_LIMIT)
  const normalizedMemorySummary = clipText(normalizeWorkingMemory(memorySummary), EMBEDDING_INPUT_CHAR_LIMIT)

  const tasks = [
    persistRecentHistory(userId, normalizedUserPrompt, normalizedAssistantReply),
    persistSemanticMemory(userId, normalizedUserPrompt, normalizedAssistantReply, normalizedMemorySummary),
  ]

  const response = await Promise.allSettled(tasks)

  response.forEach(settledResult => {
    if (settledResult.status === "rejected") {
      console.error("Failed to persist AI memory state.", settledResult.reason)
    }
  })
}

function shouldQuerySemanticMemory(promptValue: string, memory: string): boolean {
  const normalizedPrompt = normalizeText(promptValue)
  if (!normalizedPrompt) return false

  const wordCount = normalizedPrompt.split(/\s+/).filter(Boolean).length

  if (REFERENTIAL_PROMPT_PATTERN.test(normalizedPrompt)) return true
  if (wordCount <= 8) return true
  if (!memory || normalizeText(memory).includes(NONE_VALUE)) return false

  return /\b(compare|remember|before|earlier|different|another)\b/i.test(normalizedPrompt)
}
