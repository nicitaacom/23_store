import { describe, expect, it } from "vitest"

import { relinkBackupStorageValue, selectBackupStoragePath } from "./backupStorageRelink"

const CURRENT_SUPABASE_URL = "https://current-project.supabase.co"
const OLD_PUBLIC_URL = "https://old-project.supabase.co/storage/v1/object/public"

describe("backup Storage URL relinking", () => {
  it("reads a backup bucket and decoded path from a public URL", () => {
    expect(selectBackupStoragePath(`${OLD_PUBLIC_URL}/23_product-images/folder/My%20Image.avif`)).toEqual({
      bucket: "23_product-images",
      path: "folder/My Image.avif",
    })
  })

  it("relinks matching scalar, array and nested JSON values", () => {
    const matchingUrl = `${OLD_PUBLIC_URL}/23_product-images/products/item.avif`
    const nestedUrl = `${OLD_PUBLIC_URL}/23_product-images/mockups/mousepad.png`
    const relinked = relinkBackupStorageValue(
      {
        img_url: [matchingUrl],
        variants: [{ image_url: matchingUrl }],
        personalization: { defaultConfig: { mockupUrl: nestedUrl } },
      },
      new Set(["23_product-images/products/item.avif", "23_product-images/mockups/mousepad.png"]),
      CURRENT_SUPABASE_URL,
    )

    expect(relinked.value).toEqual({
      img_url: [`${CURRENT_SUPABASE_URL}/storage/v1/object/public/23_product-images/products/item.avif`],
      variants: [{ image_url: `${CURRENT_SUPABASE_URL}/storage/v1/object/public/23_product-images/products/item.avif` }],
      personalization: {
        defaultConfig: { mockupUrl: `${CURRENT_SUPABASE_URL}/storage/v1/object/public/23_product-images/mockups/mousepad.png` },
      },
    })
    expect(relinked.urlsUpdated).toBe(3)
    expect(relinked.unresolvedReferences).toBe(0)
  })

  it("keeps external, current and missing-path URLs unchanged", () => {
    const currentUrl = `${CURRENT_SUPABASE_URL}/storage/v1/object/public/23_product-images/current.avif`
    const missingUrl = `${OLD_PUBLIC_URL}/23_product-images/missing.avif`
    const externalUrl = "https://images.example.com/storage/v1/object/public/23_product-images/current.avif"
    const value = [externalUrl, currentUrl, missingUrl, "data:image/png;base64,abc"]
    const relinked = relinkBackupStorageValue(
      value,
      new Set(["23_product-images/current.avif"]),
      CURRENT_SUPABASE_URL,
    )

    expect(relinked.value).toEqual(value)
    expect(relinked.urlsUpdated).toBe(0)
    expect(relinked.unresolvedReferences).toBe(1)
    expect(relinked.unresolvedPaths).toEqual(["23_product-images/missing.avif"])
  })

  it("ignores URLs outside the configured backup buckets", () => {
    expect(selectBackupStoragePath(`${OLD_PUBLIC_URL}/another-bucket/image.png`)).toBeNull()
  })
})
