export function setCookie(name: string, val: string) {
  if (typeof document === "undefined") return

  const date = new Date()
  const value = val

  // Set it expire in 7 days
  date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Set it
  document.cookie = name + "=" + value + "; expires=" + date.toUTCString() + "; path=/"
}

/**
 *
 * @returns return cookie value by cookie name (type of string)
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return

  const value = "; " + document.cookie
  const decodedValue = decodeURIComponent(value)
  const parts = decodedValue.split("; " + name + "=")

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift()
  }

  return undefined
}
