// A message an owner reads has to name the failure, what was kept, and a next step.
// Provider text such as a JSON parse failure is replaced with the localized recovery sentence.
const DEVELOPER_TERM =
  /\b(?:json|xml|https?|websocket|socket|endpoint|payload|null|undefined|nan|regex|sql|redis|supabase|dynamodb|s3|stack trace|promise|callback|mutex|boolean|enum|props|dom|response body|request body|status code)\b/i
const CAMEL_CASE_IDENTIFIER = /\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/
const ENV_VAR_IDENTIFIER = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/
const QUOTED_VALUE = /"[^"]*"|'[^']*'|`[^`]*`/g
const SOURCE_PATH = /(?:^|\s)(?:\/|\.\/)[\w./-]+\.(?:ts|tsx|js|mjs)\b|\bPath:/i
const FILLER_MESSAGE =
  /\b(?:unexpected (?:system |server )?(?:error|failure)|something went wrong|error\s+(?:has\s+)?oc+ur+ed|(?:an?|the)\s+(?:unknown|unexpected)\s+error|unknown error|internal (?:server )?error|(?:operation|request|action) failed|failed unexpectedly)\b/i

function storedUpdateNotSaved() {
  return "This change was not saved. Contact support if this continues."
}

function isDeveloperFacingMessage(message: string) {
  const unquoted = message.replace(QUOTED_VALUE, " ")
  return (
    DEVELOPER_TERM.test(message) ||
    CAMEL_CASE_IDENTIFIER.test(unquoted) ||
    ENV_VAR_IDENTIFIER.test(unquoted) ||
    SOURCE_PATH.test(message) ||
    FILLER_MESSAGE.test(message)
  )
}

export function recoverStoredUpdateError(message: string) {
  return presentStoredUpdateError(message, storedUpdateNotSaved())
}

export function presentStoredUpdateError(message: string, recoveryMessage: string) {
  const text = message.trim()
  if (!text || text === storedUpdateNotSaved() || isDeveloperFacingMessage(text)) return recoveryMessage
  return text
}
