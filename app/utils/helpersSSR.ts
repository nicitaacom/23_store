//This helpers may be used on server side only

import { cookies } from "next/headers"

/**
 *
 * @returns return cookie value by cookie name (type of string)
 */
export function getCookie(name: string): string | undefined {
  return cookies().get(name) ? cookies().get(name)?.value : undefined
}

export async function setCookie(name: string, value: string, expiresInMinutes?: number) {
  // const oneWeek = 7 * 24 * 60 * 60 * 1000
  cookies().set(name, value, { expires: expiresInMinutes ? expiresInMinutes : undefined })
}
