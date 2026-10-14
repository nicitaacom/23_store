export const OPENAI_REQUEST_TIMEOUTS_MS = [30_000, 90_000] as const

export type TOpenAIRequestOptions = { timeout: number; maxRetries: 0 }
export type TOpenAIRequestEvidence = { attemptCount: number; requestIds: string[] }

export class OpenAIRequestFailure extends Error {
  constructor(
    readonly providerError: unknown,
    readonly attemptCount: number,
    readonly requestIds: string[],
  ) {
    super(`OpenAI request failed after ${attemptCount} attempt${attemptCount === 1 ? "" : "s"}`)
    this.name = "OpenAIRequestFailure"
  }
}

export class OpenAIInvalidOutputError extends Error {
  constructor(readonly request_id?: string) {
    super("OpenAI returned an unusable result")
    this.name = "OpenAIInvalidOutputError"
  }
}

export class OpenAIImageModelsUnavailableError extends Error {
  constructor() {
    super("OpenAI image generation is not enabled for this account")
    this.name = "OpenAIImageModelsUnavailableError"
  }
}

type TRequestOutcome<T> = TOpenAIRequestEvidence & { response: T }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null
}

function getErrorDetails(error: unknown) {
  const errorRecord = asRecord(error)
  const nestedError = asRecord(errorRecord?.error)
  const headers = asRecord(errorRecord?.headers)
  const getHeader = (name: string) => {
    const headerValue = headers?.get
    if (typeof headerValue === "function") {
      try {
        const value = headerValue.call(errorRecord?.headers, name)
        return typeof value === "string" ? value : null
      } catch {
        return null
      }
    }
    const value = headers?.[name] ?? headers?.[name.toLowerCase()]
    return typeof value === "string" ? value : null
  }

  const status = errorRecord?.status
  const code = errorRecord?.code ?? nestedError?.code
  const message = errorRecord?.message
  const name = errorRecord?.name
  const requestId = errorRecord?.request_id ?? errorRecord?.requestID ?? getHeader("x-request-id")

  return {
    status: typeof status === "number" ? status : undefined,
    code: typeof code === "string" ? code.toLowerCase() : "",
    message: typeof message === "string" ? message : "",
    name: typeof name === "string" ? name : "",
    requestId: typeof requestId === "string" && requestId ? requestId : undefined,
    retryAfter: getHeader("retry-after"),
  }
}

function isInsufficientCredits(error: unknown) {
  const { code, message } = getErrorDetails(error)
  return /insufficient_quota|billing_hard_limit|billing_not_active/.test(code) ||
    /exceeded your current quota|billing hard limit|no remaining credits/i.test(message)
}

function isRetryable(error: unknown) {
  if (error instanceof OpenAIInvalidOutputError) return true
  if (isInsufficientCredits(error)) return false

  const { status, name, code, message } = getErrorDetails(error)
  return status === 408 || status === 409 || status === 429 || (typeof status === "number" && status >= 500) ||
    /APIConnection(?:Timeout)?Error|TimeoutError|AbortError/.test(name) ||
    /ECONNRESET|ECONNREFUSED|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/.test(`${code} ${message}`)
}

function retryDelayMs(error: unknown) {
  const retryAfter = getErrorDetails(error).retryAfter
  if (!retryAfter) return 500

  const seconds = Number(retryAfter)
  const requestedDelay = Number.isFinite(seconds) ? seconds * 1_000 : Date.parse(retryAfter) - Date.now()
  if (!Number.isFinite(requestedDelay) || requestedDelay <= 0) return 500
  return Math.min(Math.max(requestedDelay, 500), 10_000)
}

function addRequestId(requestIds: string[], value: unknown) {
  const record = asRecord(value)
  const requestId = record?._request_id ?? record?.request_id ?? record?.requestID
  if (typeof requestId === "string" && requestId && !requestIds.includes(requestId)) requestIds.push(requestId)
}

export async function requestOpenAIWithRetry<T>(
  request: (options: TOpenAIRequestOptions) => Promise<T>,
  timeouts: readonly number[] = OPENAI_REQUEST_TIMEOUTS_MS,
): Promise<TRequestOutcome<T>> {
  const requestIds: string[] = []
  let lastError: unknown

  for (const [attemptIndex, timeout] of timeouts.entries()) {
    try {
      const response = await request({ timeout, maxRetries: 0 })
      addRequestId(requestIds, response)
      return { response, attemptCount: attemptIndex + 1, requestIds }
    } catch (error) {
      lastError = error
      addRequestId(requestIds, error)
      if (attemptIndex === timeouts.length - 1 || !isRetryable(error)) {
        throw new OpenAIRequestFailure(error, attemptIndex + 1, requestIds)
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs(error)))
    }
  }

  throw new OpenAIRequestFailure(lastError ?? new Error("OpenAI request was not attempted"), 0, requestIds)
}

export function getOpenAIRequestError(error: unknown) {
  return error instanceof OpenAIRequestFailure ? error.providerError : error
}

export function describeOpenAIRequestFailure(error: unknown, action: string, unchangedState = "No changes were saved.") {
  const originalError = getOpenAIRequestError(error)
  const details = getErrorDetails(originalError)
  const evidence = error instanceof OpenAIRequestFailure
    ? { attemptCount: error.attemptCount, requestIds: [...error.requestIds] }
    : { attemptCount: 1, requestIds: [] }
  if (details.requestId && !evidence.requestIds.includes(details.requestId)) evidence.requestIds.push(details.requestId)

  const retrySuffix = evidence.attemptCount > 1 ? " after an automatic retry" : ""
  let status: number
  let code: string
  let message: string

  if (originalError instanceof OpenAIImageModelsUnavailableError) {
    status = 503
    code = "OPENAI_IMAGE_MODEL_UNAVAILABLE"
    message = `OpenAI image generation is not enabled for this account. ${unchangedState} Contact the store owner to enable an image model.`
  } else if (isInsufficientCredits(originalError)) {
    status = 503
    code = "OPENAI_INSUFFICIENT_CREDITS"
    message = `OpenAI could not ${action} because the configured account has no API credits or has reached its billing limit. ${unchangedState} Contact the store owner to restore OpenAI API billing.`
  } else if (details.status === 401 || details.status === 403) {
    status = 503
    code = "OPENAI_CREDENTIALS_REJECTED"
    message = `OpenAI rejected its configured API credentials, so it could not ${action}. ${unchangedState} Contact the store owner to restore AI access.`
  } else if (details.status === 429) {
    status = 429
    code = "OPENAI_RATE_LIMITED"
    message = `OpenAI is still limiting requests${retrySuffix}. ${unchangedState} Wait for provider capacity to recover or contact the store owner.`
  } else if (details.status === 408 || /Timeout|Abort/.test(details.name) || /ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/.test(details.message)) {
    status = 504
    code = "OPENAI_TIMEOUT"
    message = `OpenAI did not respond${retrySuffix} with the longer timeout. ${unchangedState} Contact the store owner if this continues.`
  } else if (details.status === 400 || details.status === 422) {
    status = 422
    code = "OPENAI_INPUT_REJECTED"
    message = `OpenAI rejected this request. Check the product text, image, or question and correct it before submitting again.`
  } else if (originalError instanceof OpenAIInvalidOutputError) {
    status = 502
    code = "OPENAI_INVALID_OUTPUT"
    message = `OpenAI did not return a usable result${retrySuffix}. ${unchangedState} Contact the store owner if this continues.`
  } else {
    status = details.status && details.status >= 500 ? 503 : 502
    code = "OPENAI_UNAVAILABLE"
    const reference = evidence.requestIds[0] ? ` Share provider reference ${evidence.requestIds[0]} with the store owner.` : " Contact the store owner if this continues."
    message = `OpenAI could not ${action}${retrySuffix}. ${unchangedState}${reference}`
  }

  return { status, code, message, ...evidence }
}

export function openAIRequestHeaders(evidence: TOpenAIRequestEvidence): Record<string, string> {
  return {
    "x-openai-attempt-count": String(evidence.attemptCount),
    ...(evidence.requestIds.length
      ? {
          "x-openai-request-id": evidence.requestIds[0],
          "x-openai-request-ids": JSON.stringify(evidence.requestIds),
        }
      : {}),
  }
}
