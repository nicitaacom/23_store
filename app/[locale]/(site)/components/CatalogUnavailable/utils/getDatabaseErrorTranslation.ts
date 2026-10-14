export function getDatabaseErrorTranslation(message: string, status: number) {
  const normalizedMessage = message.toLowerCase()

  if (/supabase(url|key) is required|invalid supabase(url|key)|invalid url/.test(normalizedMessage)) {
    return "catalog_database_configuration_missing" as const
  }
  if (status === 401 || /invalid api key|invalid jwt|jwt expired/.test(normalizedMessage)) {
    return "catalog_database_credentials_rejected" as const
  }
  if (/no available server/.test(normalizedMessage)) return "catalog_database_no_server" as const
  if (status === 0 || /fetch failed|failed to fetch|enotfound|econnrefused|timed? ?out/.test(normalizedMessage)) {
    return "catalog_database_no_response" as const
  }
  if ([502, 503, 504, 520].includes(status)) return "catalog_database_unavailable" as const
  return "catalog_database_query_rejected" as const
}
