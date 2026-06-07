//This helpers may be used on server side only
import { cookies } from "next/headers"
import { TCookieName } from "../ts/types/TCookieName"

type SetCookieOptions = Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2]

export async function getCookie(name: TCookieName): Promise<string | undefined> {
  const store = await cookies()
  return store.get(name)?.value
}

export async function setCookie(name: TCookieName, value: string, options?: SetCookieOptions): Promise<void> {
  const store = await cookies()
  store.set(name, value, options)
}
