export function describeProductCreationError(error: unknown, stage: string, isOnline: boolean) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (!/failed to fetch|networkerror|load failed/i.test(errorMessage)) {
    return `${stage}: ${errorMessage}`
  }

  const connectionHint = isOnline
    ? "The connection or service may be unavailable. Check the product list before starting another creation, and contact the store administrator if the product is missing."
    : "Your device reports no internet connection. Reconnect, then check the product list before starting another creation. Contact the store administrator if the product is missing."

  return `No response while ${stage}. ${connectionHint}`
}
