//This helpers may be used on server side only

import { cookies } from "next/headers"

/**
 *
 * @returns return cookie value by cookie name (type of string)
 */
export function getCookie(name: string): string | undefined {
  return cookies().get(name) ? cookies().get(name)?.value : undefined
}

// Set cookies in Layout.tsx if needed
