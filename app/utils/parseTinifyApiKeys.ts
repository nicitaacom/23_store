/**
 * TINIFY_API_KEY_ARR holds several Tinify keys so the uploader moves to the next one once a key runs
 * out of its monthly compressions. It was written by hand at different times, so both shapes exist:
 * a JSON array `["abc","def"]`, and a comma or newline separated list `abc, def`. Both parse here so
 * the uploader and the key check agree on how many keys there are and on their order.
 */
export function parseTinifyApiKeys(rawApiKeys: string | undefined): string[] {
  if (!rawApiKeys?.trim()) return []

  try {
    const parsedValue = JSON.parse(rawApiKeys) as unknown
    if (Array.isArray(parsedValue)) return parsedValue.map(value => String(value).trim()).filter(Boolean)
  } catch {
    // not JSON, so it is the comma or newline separated shape handled below
  }

  return rawApiKeys
    .split(/[,\n]/)
    .map(value => value.trim())
    .filter(Boolean)
}
