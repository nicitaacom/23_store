import { getCookie, setCookie } from "@/utils/helpersCSR"

export function getAnonymousId(): string | undefined {
  const anonymousId = getCookie("anonymousId")

  return anonymousId
}
