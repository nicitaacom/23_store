import { describe, expect, it } from "vitest"

import { addTarEntry, finalizeTar, parseTar } from "./tarClient"
import { buildStorageTar, readStorageTarEntries } from "./storageFilesTar"

const REPORTED_FILE_NAME =
  "2-kpl-bisutang-kosteuttavaa-aloe-vera-geelia-rikastettu-aloe-vera-uutteella-ja-glyseriinilla-on-mehukas-ja-geelimainen-kosteuttaa-ja-kosteuttaa-tehokkaasti-samalla-kun-ravitsee-ihoa-jattaen-sen-sileaksi-ja-delikaattiseksi-ihanteellinen-auringonoton-jalkeiseen-hoitoon-sopii-kaytettavaksi-3.avif"

function storageFile(path: string, contentType = "image/avif") {
  return { bucket: "23_product-images", path, contentType, bytes: new Uint8Array([0, 1, 2, 255]) }
}

describe("Storage backup paths", () => {
  it("shortens the reported 294-byte filename and restores its exact key, content type and bytes", () => {
    const file = storageFile(`nicitaacomgmailcom/prod_UHQlVIL07lkDmG/${REPORTED_FILE_NAME}`)
    const entries = parseTar(buildStorageTar([file]))

    expect(Buffer.byteLength(REPORTED_FILE_NAME)).toBe(294)
    expect(entries.has("storage-files/file-000001.avif")).toBe(true)
    expect(JSON.parse(entries.get("storage-paths.json")!.toString())).toEqual({
      "storage-files/file-000001.avif": `${file.bucket}/${file.path}`,
    })
    expect(readStorageTarEntries(entries)).toEqual([file])
  })

  it("preserves readable existing paths when they fit", () => {
    const file = storageFile("owner/product/aloe-vera-3.avif")
    const entries = parseTar(buildStorageTar([file]))

    expect(entries.has(`storage/${file.bucket}/${file.path}`)).toBe(true)
    expect(entries.has("storage-paths.json")).toBe(false)
    expect(readStorageTarEntries(entries)).toEqual([file])
  })

  it("keeps similar long names and duplicate basenames in different folders distinct", () => {
    const files = [
      storageFile(`owner/product/${"long-".repeat(60)}1.avif`),
      storageFile(`owner/product/${"long-".repeat(60)}2.avif`),
      storageFile(`another-owner/product/${"long-".repeat(60)}1.avif`),
      storageFile("owner/product/file-000001.avif"),
    ]
    const entries = parseTar(buildStorageTar(files))

    expect(entries.get("storage-files/file-000001.avif")).toEqual(Buffer.from(files[0].bytes))
    expect(entries.get("storage-files/file-000002.avif")).toEqual(Buffer.from(files[1].bytes))
    expect(entries.get("storage-files/file-000003.avif")).toEqual(Buffer.from(files[2].bytes))
    expect(readStorageTarEntries(entries)).toEqual(files)
  })

  it("bounds multibyte names, long folders and long total paths in bytes", () => {
    const files = [
      storageFile(`owner/product/${"界".repeat(90)}.avif`),
      storageFile(`${"folder".repeat(60)}/image.avif`),
      storageFile(`${"folder/".repeat(45)}image.avif`),
    ]
    const entries = parseTar(buildStorageTar(files))

    for (const name of entries.keys()) {
      expect(Buffer.byteLength(name)).toBeLessThanOrEqual(240)
      for (const component of name.split("/")) expect(Buffer.byteLength(component)).toBeLessThanOrEqual(200)
    }
    expect(readStorageTarEntries(entries)).toEqual(files)
  })

  it("shortens names with characters and reserved components rejected by Windows", () => {
    const files = [storageFile("owner/CON/image.avif"), storageFile("owner/image:one.avif"), storageFile("owner/image.avif ")]
    const entries = parseTar(buildStorageTar(files))

    expect(entries.has("storage-files/file-000001.avif")).toBe(true)
    expect(entries.has("storage-files/file-000002.avif")).toBe(true)
    expect(entries.has("storage-files/file-000003")).toBe(true)
    expect(readStorageTarEntries(entries)).toEqual(files)
  })

  it("reads legacy GNU long-name entries without a path map or MIME map", () => {
    const file = storageFile(`owner/product/${REPORTED_FILE_NAME}`, "application/octet-stream")
    const chunks: Buffer[] = []
    addTarEntry(chunks, `storage/${file.bucket}/${file.path}`, Buffer.from(file.bytes))

    expect(readStorageTarEntries(parseTar(finalizeTar(chunks)))).toEqual([file])
  })

  it("rejects missing path maps instead of skipping shortened files during restore", () => {
    const entries = new Map([["storage-files/file-000001.avif", Buffer.from("image")]])
    expect(() => readStorageTarEntries(entries)).toThrow("Missing original Storage path")
  })

  it("rejects malformed maps and duplicate destinations before restore", () => {
    const entries = parseTar(buildStorageTar([storageFile(REPORTED_FILE_NAME)]))
    entries.set("storage-paths.json", Buffer.from('{"storage-files/file-000001.avif":42}'))
    expect(() => readStorageTarEntries(entries)).toThrow("Invalid storage-paths.json")

    entries.set("storage-paths.json", Buffer.from('{"storage-files/file-000001.avif":"23_product-images/image.avif"}'))
    entries.set("storage/23_product-images/image.avif", Buffer.from("other image"))
    expect(() => readStorageTarEntries(entries)).toThrow("Duplicate storage path")
  })
})
