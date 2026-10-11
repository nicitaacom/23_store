import { describe, expect, it } from "vitest"

import { addTarEntry, finalizeTar, parseTar } from "./tarClient"

describe("tar file names", () => {
  it("uses a GNU long-name entry for UTF-8 paths exceeding 100 bytes but fewer than 100 characters", () => {
    const name = `storage/23_product-images/${"ä".repeat(40)}.avif`
    const bytes = Buffer.from("image bytes")
    const chunks: Buffer[] = []

    expect(name.length).toBeLessThan(100)
    expect(Buffer.byteLength(name)).toBeGreaterThan(100)
    addTarEntry(chunks, name, bytes)

    expect(chunks[0][156]).toBe("L".charCodeAt(0))
    expect(parseTar(finalizeTar(chunks))).toEqual(new Map([[name, bytes]]))
  })

  it("keeps long-name data aligned with the next file", () => {
    const chunks: Buffer[] = []
    const longName = `storage/23_product-images/${"long".repeat(150)}.avif`
    addTarEntry(chunks, longName, Buffer.alloc(513, 23))
    addTarEntry(chunks, "storage-content-types.json", Buffer.from("{}"))

    expect(parseTar(finalizeTar(chunks))).toEqual(
      new Map([
        [longName, Buffer.alloc(513, 23)],
        ["storage-content-types.json", Buffer.from("{}")],
      ]),
    )
  })
})
