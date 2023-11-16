export function setCookie(name: string, val: string) {
  const date = new Date()
  const value = val

  // Set it expire in 7 days
  date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Set it
  document.cookie = name + "=" + value + "; expires=" + date.toUTCString() + "; path=/"
}

export function getCookie(name: string) {
  const value = "; " + document.cookie
  const parts = value.split("; " + name + "=")

  if (parts.length == 2) {
    return parts.pop()?.split(";").shift()
  }
}
