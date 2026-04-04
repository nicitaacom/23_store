export async function getResponseErrorMessage(response: Response, fallbackMessage?: string) {
  const responseText = await response.text()

  if (!responseText) {
    return fallbackMessage || `Request failed (${response.status})`
  }

  try {
    const parsed = JSON.parse(responseText) as { error?: unknown; message?: unknown }

    if (typeof parsed === "string") {
      return parsed
    }

    if (typeof parsed.error === "string") {
      return parsed.error
    }

    if (typeof parsed.message === "string") {
      return parsed.message
    }
  } catch {}

  return responseText
}
