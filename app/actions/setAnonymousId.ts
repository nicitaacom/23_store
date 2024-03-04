"use server"

import { cookies } from "next/headers"

export function setAnonymousId() {
  "use server"
  cookies().set("anonymousId", `anonymousId_${crypto.randomUUID()}`)
}
