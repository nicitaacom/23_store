//This helpers may be used on server side only
import { cookies } from "next/headers"
import { TCookieName } from "../ts/types/TCookieName"

type SetCookieOptions = Parameters<ReturnType<typeof cookies>["set"]>[2]

/**
 * Get typed cookie value by name with autocomplete
 * @param name - Cookie name with autocomplete support
 * @returns Cookie value as string or undefined if not found
 */
export function getCookie(name: TCookieName): string | undefined {
  return cookies().get(name)?.value
}

export function setCookie(name: TCookieName, value: string): void
export function setCookie(name: TCookieName, value: string, options: SetCookieOptions): void
export function setCookie(name: TCookieName, value: string, options?: SetCookieOptions): void {
  cookies().set(name, value, options)
}
