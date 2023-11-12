//This helpers may be used on server side only

import { cookies } from "next/headers"

export function getCookie(name: string) {
  const cookieStore = cookies()
  return cookieStore.get(name)
}

// Set cookies in Layout.tsx if needed
