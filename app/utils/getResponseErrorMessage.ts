const MESSAGE_FIELDS = ["error", "message", "error_description", "detail", "description", "title"] as const
const MAX_NESTED_ERROR_DEPTH = 5

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractErrorMessage(value: unknown, depth = 0): string | null {
  if (depth > MAX_NESTED_ERROR_DEPTH || value === null || value === undefined) return null

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (!trimmedValue) return null

    // Some providers wrap JSON in a JSON string. Unwrap only a bounded number of levels and keep
    // regular text intact when it is not another serialized object or array.
    if ((trimmedValue.startsWith("{") || trimmedValue.startsWith("[")) && depth < MAX_NESTED_ERROR_DEPTH) {
      try {
        const nestedValue: unknown = JSON.parse(trimmedValue)
        return extractErrorMessage(nestedValue, depth + 1) ?? trimmedValue
      } catch {
        return trimmedValue
      }
    }

    return trimmedValue
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = extractErrorMessage(entry, depth + 1)
      if (message) return message
    }
    return null
  }

  if (!isRecord(value)) return null

  // Keep the legacy preference for a direct `error` string, then a direct `message` string.
  if (typeof value.error === "string" && value.error.trim()) return value.error.trim()
  if (typeof value.message === "string" && value.message.trim()) return value.message.trim()

  for (const field of MESSAGE_FIELDS) {
    const message = extractErrorMessage(value[field], depth + 1)
    if (message) return message
  }

  return null
}

export async function getResponseErrorMessage(response: Response, fallbackMessage?: string) {
  const responseText = await response.text()

  if (!responseText.trim()) {
    return fallbackMessage || `Request failed (${response.status})`
  }

  try {
    const parsed: unknown = JSON.parse(responseText)
    const message = extractErrorMessage(parsed)
    if (message) return message

    // Do not expose a serialized object or array as a user-facing error when it contains no
    // recognized message field. Preserve useful text and JSON-string responses above.
    if (typeof parsed === "object" && parsed !== null) {
      return fallbackMessage || `Request failed (${response.status})`
    }
  } catch {
    // Non-JSON provider errors such as HTML or text are still useful to existing callers.
  }

  return responseText.trim()
}
