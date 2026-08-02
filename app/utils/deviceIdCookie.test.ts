import { describe, expect, it, vi } from "vitest"

import { createDeviceId } from "./deviceId"
import { decryptDeviceId, DEVICE_ID_COOKIE_NAME, encryptDeviceId } from "./deviceIdCookie"

// A throwaway fixture key, never the deployed one - do not copy it into .env.local
process.env.DEVICE_ID_ENCRYPTION_KEY = "c1c47798479b34c3848fe8e89362e2e27bd2a3e6093db4b07799b6831241db45"

const OTHER_VALID_KEY = "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0"
const IV_PLUS_AUTH_TAG_BYTES = 28

describe("the cookie name", () => {
  it("is the project-prefixed 23_did", () => {
    expect(DEVICE_ID_COOKIE_NAME).toBe("23_did")
  })
})

describe("encryptDeviceId / decryptDeviceId", () => {
  it("round trips a deviceId", () => {
    const deviceId = createDeviceId()

    expect(decryptDeviceId(encryptDeviceId(deviceId))).toBe(deviceId)
  })

  it("round trips 200 different ids", () => {
    const deviceIds = Array.from({ length: 200 }, createDeviceId)

    expect(deviceIds.every(deviceId => decryptDeviceId(encryptDeviceId(deviceId)) === deviceId)).toBe(true)
  })

  it("produces a different value every time, so the cookie never repeats", () => {
    const deviceId = createDeviceId()

    expect(encryptDeviceId(deviceId)).not.toBe(encryptDeviceId(deviceId))
  })

  it("never shows the id in the value", () => {
    const deviceId = createDeviceId()

    expect(encryptDeviceId(deviceId)).not.toContain(deviceId.slice(3, 24))
    expect(encryptDeviceId(deviceId)).not.toContain("23-")
  })

  it("stays inside base64url, so no cookie escaping is needed", () => {
    expect(encryptDeviceId(createDeviceId())).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("is long enough to hold iv + auth tag + ciphertext", () => {
    const packed = Buffer.from(encryptDeviceId(createDeviceId()), "base64url")

    expect(packed.length).toBeGreaterThan(IV_PLUS_AUTH_TAG_BYTES)
  })
})

describe("decryptDeviceId — refuses a tampered cookie instead of trusting it", () => {
  const deviceId = createDeviceId()
  const cookieValue = encryptDeviceId(deviceId)

  // one flipped bit in each region of `iv | authTag | ciphertext`
  const tamperedByteOffsets = [
    ["the iv", 0],
    ["the auth tag", IV_PLUS_AUTH_TAG_BYTES - 1],
    ["the ciphertext", IV_PLUS_AUTH_TAG_BYTES + 2],
    ["the last ciphertext byte", Buffer.from(cookieValue, "base64url").length - 1],
  ] as const

  for (const [region, byteOffset] of tamperedByteOffsets) {
    it(`returns null for one flipped bit in ${region}`, () => {
      const packed = Buffer.from(cookieValue, "base64url")
      packed[byteOffset] ^= 1

      expect(decryptDeviceId(packed.toString("base64url"))).toBeNull()
    })
  }

  it("returns null for every last-character edit that changes the decoded bytes", () => {
    const originalBytes = Buffer.from(cookieValue, "base64url")
    const editedValues = Array.from("ABCXYZabcxyz0189-_")
      .filter(character => character !== cookieValue.slice(-1))
      .map(character => cookieValue.slice(0, -1) + character)
      .filter(editedValue => !Buffer.from(editedValue, "base64url").equals(originalBytes))

    expect(editedValues.length).toBeGreaterThan(0)
    expect(editedValues.every(editedValue => decryptDeviceId(editedValue) === null)).toBe(true)
  })

  it("still answers the same id for a last-character edit that decodes to the same bytes", () => {
    // base64url spends 6 bits per character, and this value's final character holds only 2 significant
    // ones - 15 of the other characters decode to the identical ciphertext, so they are the same cookie
    // written differently, not a tampered one. The auth tag is what judges tampering, not the text.
    const originalBytes = Buffer.from(cookieValue, "base64url")
    const equivalentValue = Array.from("ABCDEFGHIJKLMNOPabcdefghijklmnop0123456789-_")
      .filter(character => character !== cookieValue.slice(-1))
      .map(character => cookieValue.slice(0, -1) + character)
      .find(editedValue => Buffer.from(editedValue, "base64url").equals(originalBytes))

    expect(equivalentValue).toBeDefined()
    expect(decryptDeviceId(equivalentValue ?? "")).toBe(deviceId)
  })

  it("returns null for an edited first character", () => {
    const edited = (cookieValue.startsWith("A") ? "B" : "A") + cookieValue.slice(1)

    expect(decryptDeviceId(edited)).toBeNull()
  })

  it("returns null for a truncated value", () => {
    expect(decryptDeviceId(cookieValue.slice(0, 10))).toBeNull()
    expect(decryptDeviceId(cookieValue.slice(0, -4))).toBeNull()
  })

  it("returns null for a value holding only iv + auth tag and nothing else", () => {
    expect(decryptDeviceId(Buffer.alloc(IV_PLUS_AUTH_TAG_BYTES).toString("base64url"))).toBeNull()
  })

  it("returns null for undefined, empty and whitespace", () => {
    expect(decryptDeviceId(undefined)).toBeNull()
    expect(decryptDeviceId("")).toBeNull()
    expect(decryptDeviceId("   ")).toBeNull()
  })

  it("returns null for a hand-typed readable id", () => {
    expect(decryptDeviceId("23-Xk29vBq7mTz4LpR8nWc1s-7QF3KMBH")).toBeNull()
    expect(decryptDeviceId("anonymousId_4gu95e6IEKjATNJFxOAL7")).toBeNull()
  })

  it("returns null for characters base64url has no place for", () => {
    expect(decryptDeviceId("!!!!")).toBeNull()
    expect(decryptDeviceId("{}")).toBeNull()
  })

  it("returns null for a cookie encrypted under a different key", async () => {
    vi.resetModules()
    process.env.DEVICE_ID_ENCRYPTION_KEY = OTHER_VALID_KEY
    const otherKeyCookie = await import("./deviceIdCookie")
    const cookieFromOtherKey = otherKeyCookie.encryptDeviceId("23-Xk29vBq7mTz4LpR8nWc1s-7QF3KMBH")

    expect(decryptDeviceId(cookieFromOtherKey)).toBeNull()
  })
})
