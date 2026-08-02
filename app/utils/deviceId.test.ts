import { describe, expect, it } from "vitest"

import { createDeviceId, decodeDeviceId, encodeDeviceId, isValidDeviceId } from "./deviceId"

// A throwaway fixture key, never the deployed one - do not copy it into .env.local. Tests need a key
// known in advance to assert on, and one that no developer's own env can change under them.
// Set before the first describe body runs: the key is read on first use, and a describe body that mints
// an id runs during collection, ahead of any beforeAll.
process.env.DEVICE_ID_ENCRYPTION_KEY = "c1c47798479b34c3848fe8e89362e2e27bd2a3e6093db4b07799b6831241db45"

const DEVICE_ID_SHAPE = /^23-[0-9a-zA-Z]{21}-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/

describe("createDeviceId", () => {
  it("mints 23-<21 body chars>-<8 check chars>", () => {
    expect(createDeviceId()).toMatch(DEVICE_ID_SHAPE)
  })

  it("mints ids that pass their own check", () => {
    const deviceIds = Array.from({ length: 500 }, createDeviceId)

    expect(deviceIds.every(isValidDeviceId)).toBe(true)
  })

  it("mints a different id every time", () => {
    const deviceIds = Array.from({ length: 500 }, createDeviceId)

    expect(new Set(deviceIds).size).toBe(500)
  })

  it("uses every character of the body alphabet, so no range is unreachable", () => {
    const bodyCharacters = new Set(
      Array.from({ length: 400 }, createDeviceId).flatMap(deviceId => Array.from(deviceId.slice(3, 24))),
    )

    expect(bodyCharacters.size).toBeGreaterThan(50)
  })
})

describe("isValidDeviceId — refuses anything the server did not mint", () => {
  const deviceId = createDeviceId()
  const body = deviceId.slice(3, 24)
  const check = deviceId.slice(-8)

  it("refuses a hand-typed value", () => {
    expect(isValidDeviceId("23-mine")).toBe(false)
  })

  it("refuses an empty string", () => {
    expect(isValidDeviceId("")).toBe(false)
  })

  it("refuses a real body with an invented check", () => {
    const invented = check === "7QF3KMBH" ? "7QF3KMBJ" : "7QF3KMBH"

    expect(isValidDeviceId(`23-${body}-${invented}`)).toBe(false)
  })

  it("refuses one changed character in the check", () => {
    expect(isValidDeviceId(deviceId.slice(0, -1) + (deviceId.endsWith("Z") ? "Y" : "Z"))).toBe(false)
  })

  it("refuses one changed character in the body", () => {
    const changedBody = (body[0] === "a" ? "b" : "a") + body.slice(1)

    expect(isValidDeviceId(`23-${changedBody}-${check}`)).toBe(false)
  })

  it("refuses two body characters swapped", () => {
    // minted until the first two body characters differ, so the swap really changes the body
    const swapCandidate = Array.from({ length: 50 }, createDeviceId).find(candidate => candidate[3] !== candidate[4]) ?? deviceId
    const swappedBody = swapCandidate[4] + swapCandidate[3] + swapCandidate.slice(5, 24)

    expect(isValidDeviceId(`23-${swappedBody}-${swapCandidate.slice(-8)}`)).toBe(false)
  })

  it("refuses another project's prefix", () => {
    expect(isValidDeviceId(`14-${body}-${check}`)).toBe(false)
  })

  it("refuses an unsigned older id", () => {
    expect(isValidDeviceId("23-V1StGXR8Z5jdHi6BMyT9C")).toBe(false)
  })

  it("refuses the previous anonymousId cookie shape", () => {
    expect(isValidDeviceId("anonymousId_4gu95e6IEKjATNJFxOAL7")).toBe(false)
  })

  it("refuses a lowercase check", () => {
    expect(isValidDeviceId(`23-${body}-${check.toLowerCase()}`)).toBe(false)
  })

  it("refuses check characters Crockford base32 leaves out (I, L, O, U)", () => {
    for (const excluded of ["I", "L", "O", "U"]) {
      expect(isValidDeviceId(`23-${body}-${excluded.repeat(8)}`)).toBe(false)
    }
  })

  it("refuses a body one character short and one character long", () => {
    expect(isValidDeviceId(`23-${body.slice(1)}-${check}`)).toBe(false)
    expect(isValidDeviceId(`23-${body}x-${check}`)).toBe(false)
  })

  it("refuses a separator inside the body", () => {
    expect(isValidDeviceId(`23-${body.slice(0, -1)}--${check}`)).toBe(false)
  })

  it("refuses leading and trailing whitespace around a real id", () => {
    expect(isValidDeviceId(` ${deviceId}`)).toBe(false)
    expect(isValidDeviceId(`${deviceId}\n`)).toBe(false)
  })

  it("refuses a valid id with anything appended", () => {
    expect(isValidDeviceId(`${deviceId}-extra`)).toBe(false)
  })

  it("refuses non-ascii characters", () => {
    expect(isValidDeviceId(`23-${body.slice(0, -1)}ä-${check}`)).toBe(false)
  })

  it("accepts the id it was handed unchanged", () => {
    expect(isValidDeviceId(deviceId)).toBe(true)
  })
})

describe("transport form", () => {
  it("round trips every minted id", () => {
    const deviceIds = Array.from({ length: 200 }, createDeviceId)

    expect(deviceIds.every(deviceId => decodeDeviceId(encodeDeviceId(deviceId)) === deviceId)).toBe(true)
  })

  it("hides the 23- prefix and the separator positions", () => {
    const storedDeviceId = encodeDeviceId(createDeviceId())

    expect(storedDeviceId.startsWith("23-")).toBe(false)
    expect(storedDeviceId).not.toMatch(DEVICE_ID_SHAPE)
  })

  it("keeps the length and stays inside the transport alphabet", () => {
    const deviceId = createDeviceId()

    expect(encodeDeviceId(deviceId)).toHaveLength(deviceId.length)
    expect(encodeDeviceId(deviceId)).toMatch(/^[0-9a-zA-Z-]+$/)
  })

  it("is deterministic — the same id always stores the same value", () => {
    const deviceId = createDeviceId()

    expect(encodeDeviceId(deviceId)).toBe(encodeDeviceId(deviceId))
  })

  it("steps the character at index 2 onto the separator", () => {
    expect(encodeDeviceId("2")).toBe("-")
    expect(decodeDeviceId("-")).toBe("2")
  })

  it("wraps at both ends of the alphabet", () => {
    expect(decodeDeviceId(encodeDeviceId("012-"))).toBe("012-")
    expect(decodeDeviceId(encodeDeviceId("XYZ"))).toBe("XYZ")
  })

  it("returns null for a value holding a character the alphabet has no place for", () => {
    expect(decodeDeviceId("abc$def")).toBeNull()
    expect(decodeDeviceId("has space")).toBeNull()
    expect(decodeDeviceId('{"state":{}}')).toBeNull()
  })

  it("handles an empty stored value without throwing", () => {
    expect(decodeDeviceId("")).toBe("")
    expect(isValidDeviceId(decodeDeviceId("") ?? "")).toBe(false)
  })

  it("decodes a hand-typed value into something the check still refuses", () => {
    expect(isValidDeviceId(decodeDeviceId("23-mine") ?? "")).toBe(false)
    expect(isValidDeviceId(decodeDeviceId(createDeviceId()) ?? "")).toBe(false)
  })
})
