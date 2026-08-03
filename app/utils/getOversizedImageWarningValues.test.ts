import { describe, expect, it } from "vitest"

import { getOversizedImageWarningValues } from "@/utils/getOversizedImageWarningValues"

const ONE_MEGABYTE = 1024 * 1024

describe("getOversizedImageWarningValues", () => {
  it("uses TinyPNG and reports the PNG file size", async () => {
    const file = new File([new Uint8Array(ONE_MEGABYTE * 2)], "Image.png", { type: "image/png" })

    const getOversizedImageWarningValuesResp = await getOversizedImageWarningValues([{ file }], ONE_MEGABYTE)

    expect(getOversizedImageWarningValuesResp).toMatchObject({
      compressionUrl: "https://tinypng.com/",
      fileName: "Image.png",
      fileSize: "2MB",
      maxFileSize: "1MB",
    })
  })

  it("uses TinyJPG for a JPEG file", async () => {
    const file = new File([new Uint8Array(ONE_MEGABYTE + 1)], "Photo.jpg", { type: "image/jpeg" })

    const getOversizedImageWarningValuesResp = await getOversizedImageWarningValues([{ file }], ONE_MEGABYTE)

    expect(getOversizedImageWarningValuesResp?.compressionUrl).toBe("https://tinyjpg.com/")
  })

  it("returns null when every image fits the limit", async () => {
    const file = new File([new Uint8Array(100)], "Small.png", { type: "image/png" })

    expect(await getOversizedImageWarningValues([{ file }], ONE_MEGABYTE)).toBeNull()
  })
})
