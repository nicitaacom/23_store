import { describe, expect, it } from "vitest"

import { parseCsv, toCsv } from "./csvClient"

describe("backup CSV", () => {
  it("keeps null and empty strings distinct", () => {
    const csv = toCsv([{ last_message_body: "", owner_avatar_url: null }])

    expect(csv).toBe('last_message_body,owner_avatar_url\r\n"",')
    expect(parseCsv(csv)).toEqual([{ last_message_body: "", owner_avatar_url: null }])
  })
})
