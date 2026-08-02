import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { trackVisitAction } from "./trackVisitAction"
import { createDeviceId, decodeDeviceId, encodeDeviceId, isValidDeviceId } from "@/utils/deviceId"
import { encryptDeviceId } from "@/utils/deviceIdCookie"

// A throwaway fixture key, never the deployed one - do not copy it into .env.local
process.env.DEVICE_ID_ENCRYPTION_KEY = "c1c47798479b34c3848fe8e89362e2e27bd2a3e6093db4b07799b6831241db45"

const PUBLIC_IP = "81.175.200.14"
const FINGERPRINT = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
const OTHER_FINGERPRINT = "f".repeat(64)
const HELSINKI = "Europe/Helsinki"
const USER_ID = "6f9619ff-8b86-d011-b42d-00c04fc964ff"

const actionState = vi.hoisted(() => ({
  requestHeaders: {} as Record<string, string>,
  cookieValue: undefined as string | undefined,
  sessionUserId: null as string | null,
  redisByUserId: new Map<string, string>(),
  redisDeviceIdOwner: new Map<string, string>(),
  redisByIp: new Map<string, string>(),
  redisByFingerprint: new Map<string, string>(),
  userIdReads: [] as string[],
  ipReads: [] as string[],
  fingerprintReads: [] as string[],
  userIdWrites: [] as { userId: string; deviceId: string }[],
  ipWrites: [] as { ip: string; deviceId: string; visitorDayEnd: Date }[],
  fingerprintWrites: [] as { fingerprint: string; deviceId: string }[],
  cookieWrites: [] as { name: string; value: string; options: Record<string, unknown> }[],
  existingVisit: null as { id: string } | null,
  dedupFilters: [] as { userId: string; since: string }[],
  insertedVisits: [] as { userId: string; utmParams: Record<string, string | undefined>; pageUrl: string | null }[],
}))

vi.mock("next/headers", () => ({
  headers: async () => new Headers(actionState.requestHeaders),
}))

vi.mock("@/utils/helpersSSR", () => ({
  getCookie: async () => actionState.cookieValue,
  setCookie: async (name: string, value: string, options: Record<string, unknown>) => {
    actionState.cookieWrites.push({ name, value, options })
    actionState.cookieValue = value
  },
}))

vi.mock("@/actions/getUser", () => ({
  getUser: async () => (actionState.sessionUserId ? { id: actionState.sessionUserId } : null),
}))

vi.mock("@/libs/deviceIdRedis", () => ({
  getRedisDeviceIdByUserId: async (userId: string) => {
    actionState.userIdReads.push(userId)
    return actionState.redisByUserId.get(userId) ?? null
  },
  setRedisDeviceIdByUserId: async (userId: string, deviceId: string) => {
    actionState.userIdWrites.push({ userId, deviceId })
    actionState.redisByUserId.set(userId, deviceId)
  },
  getRedisDeviceIdOwner: async (deviceId: string) => actionState.redisDeviceIdOwner.get(deviceId) ?? null,
  setRedisDeviceIdOwner: async (deviceId: string, userId: string) => {
    actionState.redisDeviceIdOwner.set(deviceId, userId)
  },
  getRedisDeviceIdByIp: async (ip: string) => {
    actionState.ipReads.push(ip)
    return actionState.redisByIp.get(ip) ?? null
  },
  setRedisDeviceIdByIp: async (ip: string, deviceId: string, visitorDayEnd: Date) => {
    actionState.ipWrites.push({ ip, deviceId, visitorDayEnd })
    actionState.redisByIp.set(ip, deviceId)
  },
  getRedisDeviceIdByFingerprint: async (fingerprint: string) => {
    actionState.fingerprintReads.push(fingerprint)
    return actionState.redisByFingerprint.get(fingerprint) ?? null
  },
  setRedisDeviceIdByFingerprint: async (fingerprint: string, deviceId: string) => {
    actionState.fingerprintWrites.push({ fingerprint, deviceId })
    actionState.redisByFingerprint.set(fingerprint, deviceId)
  },
}))

vi.mock("@/actions/insertDBUTMVisitAction", () => ({
  insertDBUTMVisitAction: async (
    userId: string,
    utmParams: Record<string, string | undefined>,
    _metadata: unknown,
    pageUrl: string | null,
  ) => {
    actionState.insertedVisits.push({ userId, utmParams, pageUrl })
  },
}))

vi.mock("@/libs/supabase/supabaseServer", () => ({
  default: async () => ({
    from: () => {
      const dedupFilter = { userId: "", since: "" }
      const queryBuilder = {
        select: () => queryBuilder,
        eq: (_column: string, value: string) => {
          dedupFilter.userId = value
          return queryBuilder
        },
        gte: (_column: string, value: string) => {
          dedupFilter.since = value
          return queryBuilder
        },
        order: () => queryBuilder,
        limit: () => queryBuilder,
        maybeSingle: async () => {
          actionState.dedupFilters.push({ ...dedupFilter })
          return { data: actionState.existingVisit }
        },
      }

      return queryBuilder
    },
  }),
}))

function resolveStoredDeviceId(trackVisitResp: Awaited<ReturnType<typeof trackVisitAction>>): string {
  if (!("storedDeviceId" in trackVisitResp)) throw Error("expected a tracked visit, got needsFingerprint")

  return trackVisitResp.storedDeviceId
}

function resolveDeviceId(trackVisitResp: Awaited<ReturnType<typeof trackVisitAction>>): string {
  return decodeDeviceId(resolveStoredDeviceId(trackVisitResp)) ?? ""
}

beforeEach(() => {
  actionState.requestHeaders = { "x-real-ip": PUBLIC_IP, "user-agent": "vitest-unit" }
  actionState.cookieValue = undefined
  actionState.sessionUserId = null
  actionState.redisByUserId.clear()
  actionState.redisDeviceIdOwner.clear()
  actionState.redisByIp.clear()
  actionState.redisByFingerprint.clear()
  actionState.userIdReads.length = 0
  actionState.ipReads.length = 0
  actionState.fingerprintReads.length = 0
  actionState.userIdWrites.length = 0
  actionState.ipWrites.length = 0
  actionState.fingerprintWrites.length = 0
  actionState.cookieWrites.length = 0
  actionState.dedupFilters.length = 0
  actionState.insertedVisits.length = 0
  actionState.existingVisit = null
})

afterEach(() => {
  vi.useRealTimers()
})

describe("layer 0 — the signed-in account", () => {
  it("resolves the deviceId the account is mapped to", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    actionState.redisByUserId.set(USER_ID, deviceId)
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
    expect(actionState.userIdReads).toEqual([USER_ID])
  })

  it("wins over localStorage, the cookie and the IP, since the session already proved who this is", async () => {
    const accountDeviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    actionState.redisByUserId.set(USER_ID, accountDeviceId)
    actionState.cookieValue = encryptDeviceId(createDeviceId())
    actionState.redisByIp.set(PUBLIC_IP, createDeviceId())
    const trackVisitResp = await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(trackVisitResp)).toBe(accountDeviceId)
  })

  it("never reads the account key for a signed-out visitor", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.userIdReads).toHaveLength(0)
    expect(actionState.userIdWrites).toHaveLength(0)
  })

  it("maps the account to the winning id on the first signed-in visit", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.userIdWrites).toEqual([{ userId: USER_ID, deviceId }])
  })

  it("hands the same id to the same account on a machine it has never used", async () => {
    actionState.sessionUserId = USER_ID
    const firstVisitResp = await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    // a different machine: no localStorage, no cookie, an address nobody has visited from
    actionState.cookieValue = undefined
    actionState.requestHeaders = { "x-real-ip": "203.0.113.9" }
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(secondVisitResp)).toBe(resolveDeviceId(firstVisitResp))
  })

  it("refuses an account mapping that does not pass the check, and falls through", async () => {
    actionState.sessionUserId = USER_ID
    actionState.redisByUserId.set(USER_ID, "23-someone-typed-this")
    const cookieDeviceId = createDeviceId()
    actionState.cookieValue = encryptDeviceId(cookieDeviceId)

    expect(resolveDeviceId(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI))).toBe(cookieDeviceId)
  })

  it("never writes the account id itself into utm_stats", async () => {
    actionState.sessionUserId = USER_ID
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    expect(actionState.insertedVisits[0].userId).not.toBe(USER_ID)
    expect(isValidDeviceId(resolveDeviceId(trackVisitResp))).toBe(true)
  })

  it("keeps two accounts on two different deviceIds", async () => {
    actionState.sessionUserId = USER_ID
    const firstVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    actionState.sessionUserId = "another-account"
    actionState.cookieValue = undefined
    actionState.requestHeaders = { "x-real-ip": "127.0.0.1" }
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    expect(resolveDeviceId(secondVisitResp)).not.toBe(resolveDeviceId(firstVisitResp))
  })

  it("keeps the same id for one person before and after they sign in", async () => {
    const signedOutResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")
    const storedDeviceId = resolveStoredDeviceId(signedOutResp)

    actionState.sessionUserId = USER_ID
    actionState.existingVisit = { id: "row-from-the-signed-out-visit" }
    const signedInResp = await trackVisitAction(storedDeviceId, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveStoredDeviceId(signedInResp)).toBe(storedDeviceId)
    expect(actionState.insertedVisits).toHaveLength(1)
  })
})

describe("one device belongs to one account — the shared browser", () => {
  const OTHER_USER_ID = "11111111-2222-3333-4444-555555555555"

  it("keeps the shared machine as one visitor, so both accounts get the same row id", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    actionState.sessionUserId = OTHER_USER_ID
    const secondPersonResp = await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(secondPersonResp)).toBe(deviceId)
  })

  it("maps only the account that claimed the device, not the second one", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    actionState.sessionUserId = OTHER_USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.redisByUserId.get(USER_ID)).toBe(deviceId)
    expect(actionState.redisByUserId.has(OTHER_USER_ID)).toBe(false)
  })

  it("gives the second person their own id on their own machine", async () => {
    const sharedDeviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(sharedDeviceId), {}, "http://localhost:3023/en", HELSINKI)

    // the second person signs in on the shared browser, then visits from their own phone
    actionState.sessionUserId = OTHER_USER_ID
    await trackVisitAction(encodeDeviceId(sharedDeviceId), {}, "http://localhost:3023/en", HELSINKI)

    actionState.cookieValue = undefined
    actionState.requestHeaders = { "x-real-ip": "203.0.113.9" }
    const ownMachineResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    expect(resolveDeviceId(ownMachineResp)).not.toBe(sharedDeviceId)
    expect(isValidDeviceId(resolveDeviceId(ownMachineResp))).toBe(true)
  })

  it("lets the owner keep re-claiming its own device", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.userIdWrites).toEqual([
      { userId: USER_ID, deviceId },
      { userId: USER_ID, deviceId },
    ])
  })

  it("claims a device nobody owns yet", async () => {
    const deviceId = createDeviceId()
    actionState.sessionUserId = USER_ID
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.redisDeviceIdOwner.get(deviceId)).toBe(USER_ID)
  })

  it("writes no owner key for a signed-out visitor", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.redisDeviceIdOwner.size).toBe(0)
  })
})

describe("layer 1 — what localStorage sent", () => {
  it("keeps a valid stored id and never asks for a fingerprint", async () => {
    const deviceId = createDeviceId()
    const trackVisitResp = await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveStoredDeviceId(trackVisitResp)).toBe(encodeDeviceId(deviceId))
    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
    expect(actionState.insertedVisits[0].userId).toBe(deviceId)
    expect(actionState.fingerprintReads).toHaveLength(0)
  })

  it("answers the transport form, never the signed id", async () => {
    const deviceId = createDeviceId()
    const trackVisitResp = await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveStoredDeviceId(trackVisitResp)).not.toBe(deviceId)
    expect(resolveStoredDeviceId(trackVisitResp).startsWith("23-")).toBe(false)
  })

  it("asks for a fingerprint instead of trusting a hand-typed value, and writes nothing yet", async () => {
    actionState.requestHeaders = {}
    const trackVisitResp = await trackVisitAction(encodeDeviceId("23-mine"), {}, "http://localhost:3023/en", HELSINKI)

    expect(trackVisitResp).toEqual({ needsFingerprint: true })
    expect(actionState.insertedVisits).toHaveLength(0)
    expect(actionState.cookieWrites).toHaveLength(0)
    expect(actionState.ipWrites).toHaveLength(0)
    expect(actionState.fingerprintWrites).toHaveLength(0)
  })

  it("treats a stored value holding a character outside the alphabet as empty", async () => {
    actionState.requestHeaders = {}

    expect(await trackVisitAction("abc$def", {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
  })

  it("treats null and an empty string as empty", async () => {
    actionState.requestHeaders = {}

    expect(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
    expect(await trackVisitAction("", {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
  })

  it("refuses a real body with an invented check", async () => {
    actionState.requestHeaders = {}
    const deviceId = createDeviceId()
    const invented = `23-${deviceId.slice(3, 24)}-${deviceId.endsWith("Z") ? "7QF3KMBY" : "7QF3KMBZ"}`

    expect(await trackVisitAction(encodeDeviceId(invented), {}, "http://localhost:3023/en", HELSINKI)).toEqual({
      needsFingerprint: true,
    })
  })
})

describe("layer 2 — the httpOnly cookie", () => {
  it("resolves the id the cookie decrypts to when localStorage is empty", async () => {
    const deviceId = createDeviceId()
    actionState.cookieValue = encryptDeviceId(deviceId)
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
    expect(actionState.insertedVisits[0].userId).toBe(deviceId)
  })

  it("leaves the cookie alone when it already holds the winning id", async () => {
    const deviceId = createDeviceId()
    actionState.cookieValue = encryptDeviceId(deviceId)
    await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.cookieWrites).toHaveLength(0)
  })

  it("re-points the cookie when it decrypts to a different id", async () => {
    const localStorageDeviceId = createDeviceId()
    actionState.cookieValue = encryptDeviceId(createDeviceId())
    await trackVisitAction(encodeDeviceId(localStorageDeviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.cookieWrites).toHaveLength(1)
    expect(actionState.cookieWrites[0].name).toBe("23_did")
  })

  it("falls through a tampered cookie instead of trusting it", async () => {
    actionState.requestHeaders = {}
    const packedCookie = Buffer.from(encryptDeviceId(createDeviceId()), "base64url")
    packedCookie[20] ^= 1 // one flipped bit inside the auth tag
    actionState.cookieValue = packedCookie.toString("base64url")

    expect(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
  })

  it("sets the cookie httpOnly, lax, path / and expiring at the visitor's midnight", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.cookieWrites[0].options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: false })
    expect((actionState.cookieWrites[0].options.expires as Date).toISOString()).toBe("2026-08-02T21:00:00.000Z")
  })

  it("marks the cookie secure in production", async () => {
    const originalEnvironment = process.env.NODE_ENV
    // @ts-expect-error -- NODE_ENV is readonly in the Next types, and the production branch is what is under test
    process.env.NODE_ENV = "production"
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)
    // @ts-expect-error -- see above
    process.env.NODE_ENV = originalEnvironment

    expect(actionState.cookieWrites[0].options).toMatchObject({ secure: true })
  })
})

describe("layer 3 — the IP", () => {
  it("resolves the id mapped to a public address", async () => {
    const deviceId = createDeviceId()
    actionState.redisByIp.set(PUBLIC_IP, deviceId)
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
    expect(actionState.ipReads).toEqual([PUBLIC_IP])
  })

  it("reads the client end of x-forwarded-for when x-real-ip is missing", async () => {
    const deviceId = createDeviceId()
    actionState.requestHeaders = { "x-forwarded-for": `${PUBLIC_IP}, 10.0.0.1` }
    actionState.redisByIp.set(PUBLIC_IP, deviceId)

    expect(resolveDeviceId(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI))).toBe(deviceId)
  })

  it("never reads Redis for loopback, so a proxy-less VPS shares no ids", async () => {
    actionState.requestHeaders = { "x-real-ip": "127.0.0.1" }
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(trackVisitResp).toEqual({ needsFingerprint: true })
    expect(actionState.ipReads).toHaveLength(0)
  })

  it("never reads Redis for a private range or a hand-written header", async () => {
    for (const untrustworthyIp of ["10.0.0.5", "192.168.1.7", "172.16.0.1", "fe80::1", "pick-me"]) {
      actionState.requestHeaders = { "x-real-ip": untrustworthyIp }

      expect(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
    }

    expect(actionState.ipReads).toHaveLength(0)
  })

  it("refuses a Redis value that does not pass the check", async () => {
    actionState.redisByIp.set(PUBLIC_IP, "23-someone-typed-this")

    expect(await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)).toEqual({ needsFingerprint: true })
  })

  it("writes the IP key expiring at the visitor's midnight", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))
    const deviceId = createDeviceId()
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.ipWrites).toEqual([{ ip: PUBLIC_IP, deviceId, visitorDayEnd: new Date("2026-08-02T21:00:00.000Z") }])
  })

  it("skips the IP write when the address is untrustworthy", async () => {
    actionState.requestHeaders = { "x-real-ip": "127.0.0.1" }
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.ipWrites).toHaveLength(0)
  })
})

describe("layer 4 — the fingerprint", () => {
  beforeEach(() => {
    actionState.requestHeaders = { "x-real-ip": "127.0.0.1" }
  })

  it("resolves the id mapped to the fingerprint", async () => {
    const deviceId = createDeviceId()
    actionState.redisByFingerprint.set(FINGERPRINT, deviceId)
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)

    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
    expect(actionState.insertedVisits[0].userId).toBe(deviceId)
  })

  it("mints a new signed id when the fingerprint maps to nothing", async () => {
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)

    expect(isValidDeviceId(resolveDeviceId(trackVisitResp))).toBe(true)
    expect(actionState.fingerprintWrites).toEqual([{ fingerprint: FINGERPRINT, deviceId: resolveDeviceId(trackVisitResp) }])
  })

  it("mints a new id for an empty fingerprint and writes no fingerprint key", async () => {
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    expect(isValidDeviceId(resolveDeviceId(trackVisitResp))).toBe(true)
    expect(actionState.fingerprintReads).toHaveLength(0)
    expect(actionState.fingerprintWrites).toHaveLength(0)
  })

  it("refuses a fingerprint value that does not pass the check", async () => {
    actionState.redisByFingerprint.set(FINGERPRINT, "23-mine")
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)

    expect(resolveDeviceId(trackVisitResp)).not.toBe("23-mine")
    expect(isValidDeviceId(resolveDeviceId(trackVisitResp))).toBe(true)
  })

  it("hands the same id to a second browser on the same machine", async () => {
    const firstVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)
    actionState.cookieValue = undefined
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)

    expect(resolveDeviceId(secondVisitResp)).toBe(resolveDeviceId(firstVisitResp))
  })

  it("hands a different id to a different machine", async () => {
    const firstVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, FINGERPRINT)
    actionState.cookieValue = undefined
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, OTHER_FINGERPRINT)

    expect(resolveDeviceId(secondVisitResp)).not.toBe(resolveDeviceId(firstVisitResp))
  })

  it("never asks for a fingerprint twice", async () => {
    const trackVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")

    expect("needsFingerprint" in trackVisitResp).toBe(false)
  })
})

describe("the utm_stats row", () => {
  it("defaults to organic / direct when the URL had no utm params", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.insertedVisits[0].utmParams).toEqual({
      utm_source: "organic",
      utm_medium: "direct",
      utm_campaign: undefined,
      utm_term: undefined,
      utm_content: undefined,
    })
  })

  it("passes the utm params through and ignores unrelated query params", async () => {
    const searchParams = { utm_source: "instagram", utm_medium: "social", utm_campaign: "summer", modal: "CartModal" }
    await trackVisitAction(
      encodeDeviceId(createDeviceId()),
      searchParams,
      "http://localhost:3023/en?utm_source=instagram",
      HELSINKI,
    )

    expect(actionState.insertedVisits[0].utmParams).toMatchObject({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "summer",
    })
    expect(actionState.insertedVisits[0].utmParams).not.toHaveProperty("modal")
  })

  it("takes the first value of a repeated param", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), { utm_source: ["ig", "fb"] }, "http://localhost:3023/en", HELSINKI)

    expect(actionState.insertedVisits[0].utmParams.utm_source).toBe("ig")
  })

  it("stores the landing URL as it arrived, so the dashboard scopes rows by it", async () => {
    const pageUrl = "http://localhost:3023/en?utm_source=instagram&utm_medium=social"
    await trackVisitAction(encodeDeviceId(createDeviceId()), { utm_source: "instagram" }, pageUrl, HELSINKI)

    expect(actionState.insertedVisits[0].pageUrl).toBe(pageUrl)
  })

  it("stores null instead of an empty URL", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, undefined, HELSINKI)

    expect(actionState.insertedVisits[0].pageUrl).toBeNull()
  })

  it("leaves source unset when only utm_term arrived, since nothing named a source", async () => {
    await trackVisitAction(encodeDeviceId(createDeviceId()), { utm_term: "shoes" }, "http://localhost:3023/en", HELSINKI)

    expect(actionState.insertedVisits[0].utmParams.utm_source).toBeUndefined()
    expect(actionState.insertedVisits[0].utmParams.utm_term).toBe("shoes")
  })
})

describe("one row per device per visitor day", () => {
  it("skips the insert when a row already exists for this visitor day", async () => {
    actionState.existingVisit = { id: "existing-row" }
    const deviceId = createDeviceId()
    const trackVisitResp = await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.insertedVisits).toHaveLength(0)
    expect(resolveDeviceId(trackVisitResp)).toBe(deviceId)
  })

  it("still re-points every layer when the row already exists", async () => {
    actionState.existingVisit = { id: "existing-row" }
    actionState.sessionUserId = USER_ID
    const deviceId = createDeviceId()
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.userIdWrites).toHaveLength(1)
    expect(actionState.ipWrites).toHaveLength(1)
    expect(actionState.cookieWrites).toHaveLength(1)
  })

  it("looks for that row under the resolved deviceId, since the visitor's local midnight", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))
    const deviceId = createDeviceId()
    await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en", HELSINKI)

    expect(actionState.dedupFilters).toEqual([{ userId: deviceId, since: "2026-08-01T21:00:00.000Z" }])
  })

  it("uses the visitor's day, not the UTC day, for a visitor already on tomorrow's date", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T22:00:00.000Z"))
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", "Pacific/Auckland")

    expect(actionState.dedupFilters[0].since).toBe("2026-08-02T12:00:00.000Z")
  })
})

describe("arguments the browser controls", () => {
  it("falls back to a 24h window for a timezone Intl does not know", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))
    await trackVisitAction(encodeDeviceId(createDeviceId()), {}, "http://localhost:3023/en", "Mars/Olympus")

    expect((actionState.cookieWrites[0].options.expires as Date).toISOString()).toBe("2026-08-03T12:00:00.000Z")
    expect(actionState.dedupFilters[0].since).toBe("2026-08-01T12:00:00.000Z")
  })

  it("tracks the visit with no timezone argument at all", async () => {
    const deviceId = createDeviceId()

    expect(resolveDeviceId(await trackVisitAction(encodeDeviceId(deviceId), {}, "http://localhost:3023/en"))).toBe(deviceId)
  })

  it("tracks the visit with no arguments beyond the stored id", async () => {
    const deviceId = createDeviceId()

    expect(resolveDeviceId(await trackVisitAction(encodeDeviceId(deviceId)))).toBe(deviceId)
    expect(actionState.insertedVisits[0].utmParams.utm_source).toBe("organic")
  })
})

describe("the whole flow, twice", () => {
  it("gives a returning visitor the same id and exactly one row", async () => {
    actionState.requestHeaders = { "x-real-ip": "127.0.0.1" }
    const firstVisitResp = await trackVisitAction(null, { utm_source: "instagram" }, "http://localhost:3023/en", HELSINKI, "")
    const storedDeviceId = resolveStoredDeviceId(firstVisitResp)

    actionState.existingVisit = { id: "row-from-the-first-visit" }
    const secondVisitResp = await trackVisitAction(storedDeviceId, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveStoredDeviceId(secondVisitResp)).toBe(storedDeviceId)
    expect(actionState.insertedVisits).toHaveLength(1)
    expect(actionState.insertedVisits[0].utmParams.utm_source).toBe("instagram")
  })

  it("re-identifies a visitor who cleared localStorage, through the cookie it set", async () => {
    const firstVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(secondVisitResp)).toBe(resolveDeviceId(firstVisitResp))
  })

  it("re-identifies a visitor who cleared everything, through the IP key it set", async () => {
    const firstVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI, "")
    actionState.cookieValue = undefined
    const secondVisitResp = await trackVisitAction(null, {}, "http://localhost:3023/en", HELSINKI)

    expect(resolveDeviceId(secondVisitResp)).toBe(resolveDeviceId(firstVisitResp))
  })

  it("writes the id back over a hand-typed localStorage value", async () => {
    const typedValue = encodeDeviceId("23-mine")
    const firstVisitResp = await trackVisitAction(typedValue, {}, "http://localhost:3023/en", HELSINKI, "")

    expect(resolveStoredDeviceId(firstVisitResp)).not.toBe(typedValue)
    expect(isValidDeviceId(resolveDeviceId(firstVisitResp))).toBe(true)
    expect(actionState.insertedVisits[0].userId).not.toBe("23-mine")
  })
})
