export function describeProductCreationError(error: unknown, stage: string, isOnline: boolean) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (!/failed to fetch|networkerror|load failed/i.test(errorMessage)) {
    return `${stage}: ${errorMessage}`
  }

  const connectionHint = isOnline
    ? "The connection or service may be unavailable. Check your connection and try again."
    : "Your device reports no internet connection. Reconnect and try again."

  return `No response while ${stage}. ${connectionHint} Check the product list before retrying to avoid duplicates.`
}
