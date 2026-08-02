import { describe, expect, it } from "vitest"

import { getRequestIp, isTrustworthyIp } from "./requestIp"

function buildHeaders(headerValues: Record<string, string>): Headers {
  return new Headers(headerValues)
}

describe("getRequestIp", () => {
  it("reads x-real-ip first", () => {
    expect(getRequestIp(buildHeaders({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "6.6.6.6" }))).toBe("5.5.5.5")
  })

  it("takes the client end of an x-forwarded-for chain", () => {
    expect(getRequestIp(buildHeaders({ "x-forwarded-for": "81.175.200.14, 10.0.0.1, 172.16.0.9" }))).toBe("81.175.200.14")
  })

  it("trims whitespace around the value", () => {
    expect(getRequestIp(buildHeaders({ "x-real-ip": "  5.5.5.5  " }))).toBe("5.5.5.5")
    expect(getRequestIp(buildHeaders({ "x-forwarded-for": "   81.175.200.14   ,10.0.0.1" }))).toBe("81.175.200.14")
  })

  it("falls back to x-forwarded-for when x-real-ip holds only whitespace", () => {
    expect(getRequestIp(buildHeaders({ "x-real-ip": "   ", "x-forwarded-for": "81.175.200.14" }))).toBe("81.175.200.14")
  })

  it("returns null when neither header arrived", () => {
    expect(getRequestIp(buildHeaders({}))).toBeNull()
  })

  it("returns null for empty header values", () => {
    expect(getRequestIp(buildHeaders({ "x-real-ip": "", "x-forwarded-for": "" }))).toBeNull()
  })

  it("returns the leading empty hop as null rather than guessing the next one", () => {
    expect(getRequestIp(buildHeaders({ "x-forwarded-for": ", 81.175.200.14" }))).toBeNull()
  })
})

describe("isTrustworthyIp — only a parseable public address becomes a Redis key", () => {
  it("accepts a public ipv4", () => {
    expect(isTrustworthyIp("81.175.200.14")).toBe(true)
  })

  it("accepts a public ipv6", () => {
    expect(isTrustworthyIp("2001:14ba:1f00::1")).toBe(true)
  })

  it("accepts an ipv4-mapped public ipv6", () => {
    expect(isTrustworthyIp("::ffff:81.175.200.14")).toBe(true)
  })

  it("accepts 172.15.x and 172.32.x, which sit outside the private 172.16-31 block", () => {
    expect(isTrustworthyIp("172.15.0.1")).toBe(true)
    expect(isTrustworthyIp("172.32.0.1")).toBe(true)
  })

  it("refuses loopback in both families and its ipv4-mapped form", () => {
    expect(isTrustworthyIp("127.0.0.1")).toBe(false)
    expect(isTrustworthyIp("127.1.2.3")).toBe(false)
    expect(isTrustworthyIp("::1")).toBe(false)
    expect(isTrustworthyIp("::")).toBe(false)
    expect(isTrustworthyIp("::ffff:127.0.0.1")).toBe(false)
    expect(isTrustworthyIp("::FFFF:127.0.0.1")).toBe(false)
  })

  it("refuses every private ipv4 range", () => {
    for (const privateIp of [
      "10.0.0.1",
      "10.255.255.254",
      "192.168.1.7",
      "169.254.10.20",
      "172.16.0.1",
      "172.20.5.5",
      "172.31.255.254",
    ]) {
      expect(isTrustworthyIp(privateIp)).toBe(false)
    }
  })

  it("refuses ipv6 unique-local and link-local, in either letter case", () => {
    for (const privateIp of ["fc00::1", "fd12::3", "fe80::1", "FC00::1", "FD12::3", "FE80::1"]) {
      expect(isTrustworthyIp(privateIp)).toBe(false)
    }
  })

  it("refuses a hand-written header value aimed at a shared key", () => {
    expect(isTrustworthyIp("pick-me")).toBe(false)
    expect(isTrustworthyIp("unknown")).toBe(false)
    expect(isTrustworthyIp("*")).toBe(false)
  })

  it("refuses anything net.isIP will not parse", () => {
    for (const notAnIp of [
      "",
      "   ",
      "81.175.200",
      "81.175.200.14.5",
      "81.175.200.256",
      "081.175.200.14",
      "81.175.200.14:443",
      "2001:14ba::1::2",
    ]) {
      expect(isTrustworthyIp(notAnIp)).toBe(false)
    }
  })

  it("refuses null", () => {
    expect(isTrustworthyIp(null)).toBe(false)
  })

  it("refuses a megabyte of text", () => {
    expect(isTrustworthyIp("a".repeat(1024 * 1024))).toBe(false)
  })
})
