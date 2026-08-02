import { afterAll, describe, expect, it, vi } from "vitest"

// Throwaway fixture keys, never the deployed one - do not copy either into .env.local
const VALID_KEY = "c1c47798479b34c3848fe8e89362e2e27bd2a3e6093db4b07799b6831241db45"
const OTHER_VALID_KEY = "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0"
const MISSING_KEY_MESSAGE = "DEVICE_ID_ENCRYPTION_KEY must hold 64 hex characters (32 bytes)"

// the keys memoize on first use, so each case re-imports the module with its own env value
async function freshDeviceIdKeys(keyHex: string | undefined) {
  vi.resetModules()
  // Reflect.deleteProperty rather than `delete`, since env.d.ts declares the var as a required string
  if (keyHex === undefined) Reflect.deleteProperty(process.env, "DEVICE_ID_ENCRYPTION_KEY")
  else process.env.DEVICE_ID_ENCRYPTION_KEY = keyHex

  return import("./deviceIdKeys")
}

afterAll(() => {
  process.env.DEVICE_ID_ENCRYPTION_KEY = VALID_KEY
})

describe("getDeviceIdEncryptionKey", () => {
  it("returns the 32 raw bytes behind the hex env var", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys(VALID_KEY)

    expect(getDeviceIdEncryptionKey()).toHaveLength(32)
    expect(getDeviceIdEncryptionKey().equals(Buffer.from(VALID_KEY, "hex"))).toBe(true)
  })

  it("accepts uppercase hex", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys(VALID_KEY.toUpperCase())

    expect(getDeviceIdEncryptionKey().equals(Buffer.from(VALID_KEY, "hex"))).toBe(true)
  })

  it("memoizes, so repeated reads hand back the same buffer", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys(VALID_KEY)

    expect(getDeviceIdEncryptionKey()).toBe(getDeviceIdEncryptionKey())
  })

  it("throws a message naming the env var and how to generate one when it is missing", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys(undefined)

    expect(() => getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)
    expect(() => getDeviceIdEncryptionKey()).toThrow("openssl rand -hex 32")
  })

  it("throws for an empty value", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys("")

    expect(() => getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)
  })

  it("throws for 63 and 65 hex characters", async () => {
    const shortKeys = await freshDeviceIdKeys(VALID_KEY.slice(0, -1))
    expect(() => shortKeys.getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)

    const longKeys = await freshDeviceIdKeys(`${VALID_KEY}0`)
    expect(() => longKeys.getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)
  })

  it("throws for 64 characters that are not hex", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys("z".repeat(64))

    expect(() => getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)
  })

  it("throws for a passphrase someone typed instead of a hex key", async () => {
    const { getDeviceIdEncryptionKey } = await freshDeviceIdKeys("my-super-secret-device-key")

    expect(() => getDeviceIdEncryptionKey()).toThrow(MISSING_KEY_MESSAGE)
  })
})

describe("getDeviceIdSigningKey", () => {
  it("is 32 bytes and never the encryption key itself", async () => {
    const { getDeviceIdEncryptionKey, getDeviceIdSigningKey } = await freshDeviceIdKeys(VALID_KEY)

    expect(getDeviceIdSigningKey()).toHaveLength(32)
    expect(getDeviceIdSigningKey().equals(getDeviceIdEncryptionKey())).toBe(false)
  })

  it("is deterministic for one env key", async () => {
    const firstImport = await freshDeviceIdKeys(VALID_KEY)
    const secondImport = await freshDeviceIdKeys(VALID_KEY)

    expect(firstImport.getDeviceIdSigningKey().equals(secondImport.getDeviceIdSigningKey())).toBe(true)
  })

  it("changes with the env key", async () => {
    const firstImport = await freshDeviceIdKeys(VALID_KEY)
    const signingKey = Buffer.from(firstImport.getDeviceIdSigningKey())
    const secondImport = await freshDeviceIdKeys(OTHER_VALID_KEY)

    expect(secondImport.getDeviceIdSigningKey().equals(signingKey)).toBe(false)
  })

  it("throws the same message when the env var is missing", async () => {
    const { getDeviceIdSigningKey } = await freshDeviceIdKeys(undefined)

    expect(() => getDeviceIdSigningKey()).toThrow(MISSING_KEY_MESSAGE)
  })
})
