import { describe, expect, it } from "vitest"

import { slugify, slugifyEmail } from "./slugify"

describe("slugify", () => {
  it("transliterates and spells % as pct", () => {
    expect(slugify("сливки 30%")).toBe("slivki-30pct")
  })

  it("lowercases and collapses every run of anything else to one -", () => {
    expect(slugify("Hello-World!_@example  #2023")).toBe("hello-world-example-2023")
  })

  it("keeps a Finnish or Swedish word instead of dropping its letters", () => {
    expect(slugify("Ähtäri Sävsjö")).toBe("ahtari-savsjo")
    expect(slugify("Größe Straße")).toBe("grosse-strasse")
  })

  it("leaves no leading or trailing separator", () => {
    expect(slugify("  ***  mousepad  ***  ")).toBe("mousepad")
  })

  it("returns an empty string when nothing survives", () => {
    expect(slugify("🙂🙂")).toBe("")
  })
})

describe("slugifyEmail", () => {
  it("removes @ and . with nothing in their place", () => {
    expect(slugifyEmail("nicitaacom@gmail.com")).toBe("nicitaacomgmailcom")
    expect(slugifyEmail("email@example.com")).toBe("emailexamplecom")
  })

  it("lowercases the address, so one account only ever has one folder", () => {
    expect(slugifyEmail("Nicitaacom@Gmail.Com")).toBe(slugifyEmail("nicitaacom@gmail.com"))
  })

  it("removes the separators a plus tag or a dotted name would leave behind", () => {
    expect(slugifyEmail("first.last+shop@example.co.uk")).toBe("firstlastshopexamplecouk")
  })
})
