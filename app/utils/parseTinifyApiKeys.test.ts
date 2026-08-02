import { describe, expect, it } from "vitest"

import { parseTinifyApiKeys } from "@/utils/parseTinifyApiKeys"

/**
 * This parse used to sit inline in `app/api/tinify/route.ts`. It moved out so the uploader and
 * `app/utils/checkKeys.ts` count the keys the same way, and these cases pin the behaviour it had
 * there - both written shapes, and the trimming that decides how many keys the uploader gets.
 */
describe("parseTinifyApiKeys", () => {
  it("reads the JSON array shape", () => {
    expect(parseTinifyApiKeys('["first-key","second-key"]')).toEqual(["first-key", "second-key"])
  })

  it("reads the comma separated shape", () => {
    expect(parseTinifyApiKeys("first-key, second-key")).toEqual(["first-key", "second-key"])
  })

  it("reads the newline separated shape", () => {
    expect(parseTinifyApiKeys("first-key\nsecond-key\n")).toEqual(["first-key", "second-key"])
  })

  it("trims every key and drops the empty ones", () => {
    expect(parseTinifyApiKeys('[" first-key ", "", "second-key"]')).toEqual(["first-key", "second-key"])
    expect(parseTinifyApiKeys("first-key,,  second-key ,")).toEqual(["first-key", "second-key"])
  })

  it("answers an empty list for an absent or blank value", () => {
    expect(parseTinifyApiKeys(undefined)).toEqual([])
    expect(parseTinifyApiKeys("   ")).toEqual([])
    expect(parseTinifyApiKeys("[]")).toEqual([])
  })

  it("falls back to the separated shape when the value is JSON but not an array", () => {
    expect(parseTinifyApiKeys('"only-key"')).toEqual(['"only-key"'])
  })
})
