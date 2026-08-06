import { describe, expect, it } from "vitest"

import {
  relinkBackupStorageValue,
  selectBackupPathsByFolder,
  selectBackupStoragePath,
  selectRelinkedPathsByFolder,
} from "./backupStorageRelink"

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

  it("reads a path out of the retired 23_public-images bucket so an old row can be reported", () => {
    expect(selectBackupStoragePath(`${OLD_PUBLIC_URL}/23_public-images/old-uuid/old-uuid/beard-bib.avif`)).toEqual({
      bucket: "23_public-images",
      path: "old-uuid/old-uuid/beard-bib.avif",
    })
  })
})

describe("relinking a restored row by the folder its images belong in", () => {
  const PRODUCT_FOLDER = "23_product-images/nicitaacomgmailcom/prod_T1IRAxDEq5VtEmno"

  it("groups stored files by folder and numbers them the way they were uploaded", () => {
    const pathsByFolder = selectBackupPathsByFolder([
      `${PRODUCT_FOLDER}/slivki-30pct-10.jpg`,
      `${PRODUCT_FOLDER}/slivki-30pct-2.jpg`,
      `${PRODUCT_FOLDER}/slivki-30pct-1.jpg`,
      "23_avatar-images/nicitaacomgmailcom/avatar.png",
    ])

    expect(pathsByFolder.get(PRODUCT_FOLDER)).toEqual([
      `${PRODUCT_FOLDER}/slivki-30pct-1.jpg`,
      `${PRODUCT_FOLDER}/slivki-30pct-2.jpg`,
      `${PRODUCT_FOLDER}/slivki-30pct-10.jpg`,
    ])
    expect(pathsByFolder.get("23_avatar-images/nicitaacomgmailcom")).toEqual(["23_avatar-images/nicitaacomgmailcom/avatar.png"])
  })

  it("pairs a row's unresolved paths with the folder's files in order and leaves the extra one unresolved", () => {
    const relinkedPaths = selectRelinkedPathsByFolder(
      ["23_public-images/old-uuid/first.avif", "23_public-images/old-uuid/second.avif", "23_public-images/old-uuid/third.avif"],
      PRODUCT_FOLDER,
      selectBackupPathsByFolder([`${PRODUCT_FOLDER}/slivki-30pct-1.jpg`, `${PRODUCT_FOLDER}/slivki-30pct-2.jpg`]),
    )

    expect(Object.fromEntries(relinkedPaths)).toEqual({
      "23_public-images/old-uuid/first.avif": `${PRODUCT_FOLDER}/slivki-30pct-1.jpg`,
      "23_public-images/old-uuid/second.avif": `${PRODUCT_FOLDER}/slivki-30pct-2.jpg`,
    })
  })

  it("relinks a retired-bucket URL through the map and keeps a variant URL equal to its img_url entry", () => {
    const firstOldUrl = `${OLD_PUBLIC_URL}/23_public-images/old-uuid/first.avif`
    const secondOldUrl = `${OLD_PUBLIC_URL}/23_public-images/old-uuid/second.avif`
    const availablePaths = new Set([`${PRODUCT_FOLDER}/slivki-30pct-1.jpg`, `${PRODUCT_FOLDER}/slivki-30pct-2.jpg`])
    const relinkedPaths = selectRelinkedPathsByFolder(
      ["23_public-images/old-uuid/first.avif", "23_public-images/old-uuid/second.avif"],
      PRODUCT_FOLDER,
      selectBackupPathsByFolder(availablePaths),
    )

    const relinked = relinkBackupStorageValue(
      { img_url: [firstOldUrl, secondOldUrl], variants: [{ image_url: secondOldUrl }] },
      availablePaths,
      CURRENT_SUPABASE_URL,
      relinkedPaths,
    )

    expect(relinked.value).toEqual({
      img_url: [
        `${CURRENT_SUPABASE_URL}/storage/v1/object/public/${PRODUCT_FOLDER}/slivki-30pct-1.jpg`,
        `${CURRENT_SUPABASE_URL}/storage/v1/object/public/${PRODUCT_FOLDER}/slivki-30pct-2.jpg`,
      ],
      variants: [{ image_url: `${CURRENT_SUPABASE_URL}/storage/v1/object/public/${PRODUCT_FOLDER}/slivki-30pct-2.jpg` }],
    })
    expect(relinked.urlsUpdated).toBe(3)
    expect(relinked.unresolvedReferences).toBe(0)
  })

  it("keeps a URL unresolved when the folder it was paired with holds no such file", () => {
    const missingUrl = `${OLD_PUBLIC_URL}/23_public-images/old-uuid/first.avif`
    const relinked = relinkBackupStorageValue(
      missingUrl,
      new Set([`${PRODUCT_FOLDER}/slivki-30pct-1.jpg`]),
      CURRENT_SUPABASE_URL,
      new Map([["23_public-images/old-uuid/first.avif", `${PRODUCT_FOLDER}/deleted-since-the-listing.jpg`]]),
    )

    expect(relinked.value).toBe(missingUrl)
    expect(relinked.urlsUpdated).toBe(0)
    expect(relinked.unresolvedPaths).toEqual(["23_public-images/old-uuid/first.avif"])
  })

  it("relinks an avatar by the account's own email folder", () => {
    const oldAvatarUrl = `${OLD_PUBLIC_URL}/23_avatar-images/6a1f2c7e-old-auth-id/avatar.png`
    const availablePaths = new Set(["23_avatar-images/nicitaacomgmailcom/avatar.png"])
    const relinked = relinkBackupStorageValue(
      oldAvatarUrl,
      availablePaths,
      CURRENT_SUPABASE_URL,
      selectRelinkedPathsByFolder(
        ["23_avatar-images/6a1f2c7e-old-auth-id/avatar.png"],
        "23_avatar-images/nicitaacomgmailcom",
        selectBackupPathsByFolder(availablePaths),
      ),
    )

    expect(relinked.value).toBe(`${CURRENT_SUPABASE_URL}/storage/v1/object/public/23_avatar-images/nicitaacomgmailcom/avatar.png`)
    expect(relinked.urlsUpdated).toBe(1)
  })
})
