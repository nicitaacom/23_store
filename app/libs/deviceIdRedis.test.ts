import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getRedisDeviceIdByFingerprint,
  getRedisDeviceIdByIp,
  getRedisDeviceIdByUserId,
  getRedisDeviceIdOwner,
  setRedisDeviceIdByFingerprint,
  setRedisDeviceIdByIp,
  setRedisDeviceIdByUserId,
  setRedisDeviceIdOwner,
} from "./deviceIdRedis"

const redisState = vi.hoisted(() => ({
  store: new Map<string, string>(),
  getKeys: [] as string[],
  setCalls: [] as { key: string; value: string; options: { ex?: number; exat?: number } }[],
  clientCount: 0,
}))

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => {
      redisState.clientCount += 1

      return {
        async get(key: string) {
          redisState.getKeys.push(key)
          return redisState.store.get(key) ?? null
        },
        async set(key: string, value: string, options: { ex?: number; exat?: number }) {
          redisState.setCalls.push({ key, value, options })
          redisState.store.set(key, value)
        },
      }
    },
  },
}))

const DEVICE_ID = "23-Xk29vBq7mTz4LpR8nWc1s-7QF3KMBH"
const FINGERPRINT = "a".repeat(64)
const IP = "81.175.200.14"
const USER_ID = "6f9619ff-8b86-d011-b42d-00c04fc964ff"
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

beforeEach(() => {
  redisState.store.clear()
  redisState.getKeys.length = 0
  redisState.setCalls.length = 0
})

describe("the account layer keys", () => {
  it("reads and writes utm:23:device-id:by-user-id:<account uuid>", async () => {
    await setRedisDeviceIdByUserId(USER_ID, DEVICE_ID)

    expect(redisState.setCalls[0].key).toBe(`utm:23:device-id:by-user-id:${USER_ID}`)
    expect(redisState.setCalls[0].value).toBe(DEVICE_ID)
    expect(await getRedisDeviceIdByUserId(USER_ID)).toBe(DEVICE_ID)
  })

  it("expires 30 days after the last visit, the longest of the three", async () => {
    await setRedisDeviceIdByUserId(USER_ID, DEVICE_ID)

    expect(redisState.setCalls[0].options).toEqual({ ex: THIRTY_DAYS_IN_SECONDS })
  })

  it("answers null for an account that has never visited", async () => {
    expect(await getRedisDeviceIdByUserId("11111111-2222-3333-4444-555555555555")).toBeNull()
  })

  it("keeps two accounts on two different deviceIds", async () => {
    await setRedisDeviceIdByUserId(USER_ID, DEVICE_ID)
    await setRedisDeviceIdByUserId("other-account", "23-aaaaaaaaaaaaaaaaaaaaa-AAAAAAAA")

    expect(await getRedisDeviceIdByUserId(USER_ID)).toBe(DEVICE_ID)
    expect(await getRedisDeviceIdByUserId("other-account")).toBe("23-aaaaaaaaaaaaaaaaaaaaa-AAAAAAAA")
  })
})

describe("the device owner keys", () => {
  it("reads and writes utm:23:device-id:owner:<deviceId>", async () => {
    await setRedisDeviceIdOwner(DEVICE_ID, USER_ID)

    expect(redisState.setCalls[0].key).toBe(`utm:23:device-id:owner:${DEVICE_ID}`)
    expect(redisState.setCalls[0].value).toBe(USER_ID)
    expect(await getRedisDeviceIdOwner(DEVICE_ID)).toBe(USER_ID)
  })

  it("expires on the same 30 days as the account mapping", async () => {
    await setRedisDeviceIdOwner(DEVICE_ID, USER_ID)

    expect(redisState.setCalls[0].options).toEqual({ ex: THIRTY_DAYS_IN_SECONDS })
  })

  it("answers null for a device nobody has claimed", async () => {
    expect(await getRedisDeviceIdOwner("23-aaaaaaaaaaaaaaaaaaaaa-AAAAAAAA")).toBeNull()
  })
})

describe("the IP layer keys", () => {
  it("reads and writes utm:23:device-id:by-ip:<ip>", async () => {
    await setRedisDeviceIdByIp(IP, DEVICE_ID, new Date("2026-08-02T21:00:00.000Z"))

    expect(redisState.setCalls[0].key).toBe(`utm:23:device-id:by-ip:${IP}`)
    expect(redisState.setCalls[0].value).toBe(DEVICE_ID)
    expect(await getRedisDeviceIdByIp(IP)).toBe(DEVICE_ID)
    expect(redisState.getKeys).toContain(`utm:23:device-id:by-ip:${IP}`)
  })

  it("expires at the visitor's midnight, as whole unix seconds", async () => {
    const visitorDayEnd = new Date("2026-08-02T21:00:00.750Z")
    await setRedisDeviceIdByIp(IP, DEVICE_ID, visitorDayEnd)

    expect(redisState.setCalls[0].options).toEqual({ exat: 1785704400 })
    expect(redisState.setCalls[0].options.exat).toBe(Math.floor(visitorDayEnd.getTime() / 1000))
  })

  it("keeps ipv6 addresses in the key as they arrive", async () => {
    await setRedisDeviceIdByIp("2001:14ba:1f00::1", DEVICE_ID, new Date())

    expect(redisState.setCalls[0].key).toBe("utm:23:device-id:by-ip:2001:14ba:1f00::1")
  })

  it("answers null for an address nobody has visited from", async () => {
    expect(await getRedisDeviceIdByIp("203.0.113.9")).toBeNull()
  })
})

describe("the fingerprint layer keys", () => {
  it("reads and writes utm:23:device-id:by-fingerprint:<sha256>", async () => {
    await setRedisDeviceIdByFingerprint(FINGERPRINT, DEVICE_ID)

    expect(redisState.setCalls[0].key).toBe(`utm:23:device-id:by-fingerprint:${FINGERPRINT}`)
    expect(await getRedisDeviceIdByFingerprint(FINGERPRINT)).toBe(DEVICE_ID)
  })

  it("expires 10 minutes after it was written", async () => {
    await setRedisDeviceIdByFingerprint(FINGERPRINT, DEVICE_ID)

    expect(redisState.setCalls[0].options).toEqual({ ex: 600 })
  })

  it("accepts a real sha256 digest", async () => {
    const digest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    await setRedisDeviceIdByFingerprint(digest, DEVICE_ID)

    expect(await getRedisDeviceIdByFingerprint(digest)).toBe(DEVICE_ID)
  })
})

describe("a value that is not a sha256 digest never becomes a key", () => {
  const wrongShapes = [
    ["empty", ""],
    ["one character short", "a".repeat(63)],
    ["one character long", "a".repeat(65)],
    ["uppercase hex", "A".repeat(64)],
    ["non-hex letters", "z".repeat(64)],
    ["a sentence", "not a fingerprint at all"],
    ["json", '{"fingerprint":"a"}'],
    ["a megabyte of text", "b".repeat(1024 * 1024)],
    ["a key-injection attempt", `${"a".repeat(64)}\nutm:23:device-id:by-ip:81.175.200.14`],
  ] as const

  for (const [label, wrongShape] of wrongShapes) {
    it(`refuses ${label} on read and on write`, async () => {
      expect(await getRedisDeviceIdByFingerprint(wrongShape)).toBeNull()
      await setRedisDeviceIdByFingerprint(wrongShape, DEVICE_ID)

      expect(redisState.getKeys).toHaveLength(0)
      expect(redisState.setCalls).toHaveLength(0)
      expect(redisState.store.size).toBe(0)
    })
  }
})

describe("the client itself", () => {
  it("is built once and reused by every layer", async () => {
    await getRedisDeviceIdByUserId(USER_ID)
    await setRedisDeviceIdByUserId(USER_ID, DEVICE_ID)
    await getRedisDeviceIdByIp(IP)
    await setRedisDeviceIdByIp(IP, DEVICE_ID, new Date())
    await getRedisDeviceIdByFingerprint(FINGERPRINT)
    await setRedisDeviceIdByFingerprint(FINGERPRINT, DEVICE_ID)

    expect(redisState.clientCount).toBe(1)
  })
})
