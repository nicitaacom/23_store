import { getCookie, setCookie } from "@/utils/helpersCSR"

export function getAnonymousId(): string {
  const anonymousId = getCookie("anonymousId")
  if (!anonymousId) {
    const anonymousId = `anonymousId_${crypto.randomUUID()}`
    setCookie("anonymousId", anonymousId)
    return anonymousId
  }
  return anonymousId
}
