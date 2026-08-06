import { describe, expect, it } from "vitest"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { slugifyFileNameForBucket } from "./slugifyFileNameForBucket"

// The real one reaches into next-international's client context; here the key is returned unchanged,
// so both error returns are checked by the key itself.
const translate = ((key: string) => key) as unknown as TI18nFunction

describe("slugifyFileNameForBucket", () => {
  it("slugs the base name and keeps the extension", () => {
    expect(slugifyFileNameForBucket(translate, "Сливки 30%.JPG")).toEqual(["slivki-30pct.jpg"])
  })

  it("splits at the LAST dot, so image.dep.png keeps its real extension", () => {
    expect(slugifyFileNameForBucket(translate, "image.dep.png")).toEqual(["image-dep.png"])
  })

  it("joins a suffix with the same - separator the rest of the name uses", () => {
    expect(slugifyFileNameForBucket(translate, "mousepad.avif", "2")).toEqual(["mousepad-2.avif"])
  })

  it("falls back to image when nothing of the base name survives", () => {
    expect(slugifyFileNameForBucket(translate, "🙂.png")).toEqual(["image.png"])
  })

  it("returns the error key when there is no dot at all", () => {
    expect(slugifyFileNameForBucket(translate, "screenshot")).toBe("support.error.filename_must_contain_dot")
  })

  it("returns the error key when the extension slugs to nothing", () => {
    expect(slugifyFileNameForBucket(translate, "screenshot.🙂")).toBe("support.error.file_extension_is_required")
  })
})
