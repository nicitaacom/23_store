"use server"
//This helpers may be used on server side only

import { cookies } from "next/headers"

/**
 *
 * @returns return cookie value by cookie name (type of string)
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const cookieStore = cookies()
  return cookieStore.get(name) ? cookieStore.get(name)?.value : undefined
}

export async function setCookie(name: string, value: string, expiresInMinutes?: number) {
  // const oneWeek = 7 * 24 * 60 * 60 * 1000
  cookies().set(name, value, { expires: expiresInMinutes ? expiresInMinutes : undefined })
}
