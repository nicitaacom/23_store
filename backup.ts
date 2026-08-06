//
// ONE-TIME migration. Run it once, read the report, then delete this file.
//
//   node --env-file=.env.local backup.ts            # dry run - plans everything, writes nothing
//   node --env-file=.env.local backup.ts --apply    # uploads the files and updates the rows
//
// What it does
// ------------
// `23-files/` holds the Storage export of the old project: every object that lived in
// `23_public-images` and `23_avatar-images`, plus `storage-content-types.json`, which maps each
// object's ORIGINAL path to its mime type. The 6 new buckets are empty.
//
// A row in the database still points at the old path, so the old file name is the only link
// between a row and a file on disk. That name is unique across the whole export (1092 objects,
// 1092 distinct names), which is what makes it usable as the key - the folder a file sat in does
// not matter, and it is gone anyway now that the export was flattened by hand.
//
// For every URL a row holds, this builds the path that URL should have TODAY, uploads the bytes
// there, and rewrites the row:
//
//   23_products.img_url[i]     -> 23_product-images/<emailSlug>/<productId>/<titleSlug>-<i+1>.<ext>
//   23_users.avatar_url        -> 23_avatar-images/<emailSlug>/avatar.<ext>
//   23_messages.images[i]      -> 23_support-images/<emailSlug>/<created_at>.<ext>       (signed-in sender)
//                                 23_support-guest-images/<senderId>/<created_at>.<ext>  (guest sender)
//   23_personalized_designs.source_url
//                              -> 23_product-personalization-images/<emailSlug>/<productId>/<name>.<ext>
//
// `23_products.variants`, `23_products.personalization`, `23_ai_price_proposals.proposed_variants`,
// `23_tickets.owner_avatar_url` and `23_messages.sender_avatar_url` hold copies of URLs the rules
// above already placed, so they are rewritten to the same new URL instead of being planned again.
//
// The old file name is thrown away on purpose. `1pc-of-beard-bib-7_price_1TIRAxDEq5VtEmnoKqCekBvA`
// becomes `1pc-of-beard-bib-7.avif`: the name is rebuilt from the product's Finnish title and the
// image's position in `img_url`, never copied. The `_price_<priceId>` tail is still read - not to
// name anything, but to check the file really belongs to the product its URL matched, and any
// disagreement is reported instead of uploaded.
import { createClient } from "@supabase/supabase-js"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

const EXPORT_ROOT = "23-files"
const STORAGE_ROOT = path.join(EXPORT_ROOT, "storage")
const CONTENT_TYPES_FILE = path.join(EXPORT_ROOT, "storage-content-types.json")
const PUBLIC_STORAGE_PATH_PREFIX = "/storage/v1/object/public/"
const IS_APPLY_RUN = process.argv.includes("--apply")

// ── slugify ───────────────────────────────────────────────────────────────────
//
// A copy of app/utils/slugify.ts, kept identical on purpose: this script has to run standalone
// under `node backup.ts`, and the names it writes have to be the exact names uploadProductImages
// would write for the same title.
const TRANSLITERATIONS: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  і: "i", ї: "i", є: "e", ґ: "g",
  ß: "ss", ø: "o", æ: "ae", œ: "oe", đ: "d", ł: "l", þ: "th", ð: "d",
}
const COMBINING_MARKS = /[̀-ͯ]/g

function slugify(value: string): string {
  const transliterated = Array.from(value.toLowerCase())
    .map(character => TRANSLITERATIONS[character] ?? character)
    .join("")

  return transliterated
    .replace(/%/g, "pct")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function slugifyEmail(email: string): string {
  return slugify(email).replace(/-/g, "")
}

// ── the file extension ────────────────────────────────────────────────────────
//
// 7 objects in this export were stored with no extension at all and a mime type of
// `binary/octet-stream` - their real extension had been slugged INTO the name, as in
// `lamborghini-countach-1-jpeg_price_…` - so the bytes decide first and the export's mime map is
// only the fallback. The mapping itself matches getFileExtensionFromContentType in
// app/functions/createProductHelpers.ts: image/jpeg is written as "jpg", not "jpeg".
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
}

function selectExtensionFromBytes(fileBytes: Buffer): string | null {
  if (fileBytes.subarray(0, 4).toString("hex") === "89504e47") return "png"
  if (fileBytes.subarray(0, 3).toString("hex") === "ffd8ff") return "jpg"
  if (fileBytes.subarray(0, 3).toString("latin1") === "GIF") return "gif"
  if (fileBytes.subarray(0, 4).toString("latin1") === "RIFF" && fileBytes.subarray(8, 12).toString("latin1") === "WEBP") return "webp"
  if (fileBytes.subarray(4, 8).toString("latin1") === "ftyp" && fileBytes.subarray(8, 11).toString("latin1") === "avi") return "avif"
  return null
}

function selectExtension(fileBytes: Buffer, contentType: string, fileName: string): string {
  const nameExtension = fileName.includes(".") ? slugify(fileName.split(".").pop() ?? "") : ""

  return selectExtensionFromBytes(fileBytes) ?? EXTENSION_BY_CONTENT_TYPE[contentType] ?? nameExtension ?? "jpg"
}

// ── reading the export ────────────────────────────────────────────────────────

/**
 * Every file on disk under 23-files/storage, keyed by its file name alone. The export was
 * flattened by hand into folders that no longer match the paths the objects had, and the name is
 * unique across all 1092 of them, so the name is the one part of a path still worth keying on.
 */
async function readLocalFilesByName(folder = STORAGE_ROOT, localFilesByName = new Map<string, string>()): Promise<Map<string, string>> {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const localPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      await readLocalFilesByName(localPath, localFilesByName)
      continue
    }
    if (entry.name === ".emptyFolderPlaceholder") continue

    const seenPath = localFilesByName.get(entry.name)
    if (seenPath) {
      console.warn(`⚠️  two files share the name ${entry.name}: ${seenPath} and ${localPath} - keeping the first`)
      continue
    }
    localFilesByName.set(entry.name, localPath)
  }

  return localFilesByName
}

/** storage-content-types.json keys objects by their ORIGINAL path; this re-keys them by file name. */
async function readContentTypeByFileName(): Promise<Map<string, string>> {
  const contentTypeByPath = JSON.parse(await readFile(CONTENT_TYPES_FILE, "utf8")) as Record<string, string>
  const contentTypeByFileName = new Map<string, string>()

  for (const [storagePath, contentType] of Object.entries(contentTypeByPath)) {
    contentTypeByFileName.set(storagePath.slice(storagePath.lastIndexOf("/") + 1), contentType)
  }

  return contentTypeByFileName
}

/** The file name a stored public URL ends with, or null when the value is not one. */
function selectFileNameFromUrl(value: unknown): string | null {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value)
    const prefixIndex = url.pathname.indexOf(PUBLIC_STORAGE_PATH_PREFIX)
    if (prefixIndex === -1) return null

    const storagePath = decodeURIComponent(url.pathname.slice(prefixIndex + PUBLIC_STORAGE_PATH_PREFIX.length))
    return storagePath.slice(storagePath.lastIndexOf("/") + 1) || null
  } catch {
    return null
  }
}

/** The Stripe price id inside an old product file name, e.g. `…-7_price_1TIRAxDEq5VtEmno….avif`. */
function selectPriceIdFromFileName(fileName: string): string | null {
  const priceIdMatch = /_price_(price_)?([A-Za-z0-9]+)/.exec(fileName)
  return priceIdMatch ? `price_${priceIdMatch[2]}` : null
}

/** 2026-07-29_at_22-19-54 in Europe/Berlin, the same shape getTimestampFileName writes. */
function selectTimestampName(createdAt: string): string {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(createdAt))

  const [datePart, timePart] = formatted.split(" ")
  return `${datePart}_at_${timePart.replace(/:/g, "-")}`
}

// ── the plan ──────────────────────────────────────────────────────────────────

type TPlannedUpload = {
  fileName: string
  contentType: string
  bucket: string
  storagePath: string
  reason: string
}

type TRow = Record<string, unknown>

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
if (!supabaseUrl || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

const supabase = createClient(supabaseUrl, serviceRoleKey)

const localFilesByName = await readLocalFilesByName()
const contentTypeByFileName = await readContentTypeByFileName()

// Every file is read once, up front: the bytes decide the extension, and the same buffer is what
// gets uploaded later.
const fileBytesByName = new Map<string, Buffer>()
for (const [fileName, localPath] of localFilesByName) fileBytesByName.set(fileName, await readFile(localPath))

const plannedUploadByFileName = new Map<string, TPlannedUpload>()
const takenStoragePaths = new Set<string>()
const problems: string[] = []

/**
 * Reserves one destination for one exported file. A name already taken inside the same folder gets
 * `_1`, `_2`, … appended, the same way uploadImageFn's dedupe path does when two chat images land
 * in the same second.
 */
function planUpload(fileName: string, bucket: string, folder: string, baseName: string, reason: string): void {
  if (plannedUploadByFileName.has(fileName)) return

  const fileBytes = fileBytesByName.get(fileName)
  if (!fileBytes) {
    problems.push(`missing on disk: ${fileName} (referenced by ${reason})`)
    return
  }

  const contentType = contentTypeByFileName.get(fileName) ?? "application/octet-stream"
  const extension = selectExtension(fileBytes, contentType, fileName)

  let storagePath = `${folder}/${baseName}.${extension}`
  for (let copyIndex = 1; takenStoragePaths.has(`${bucket}/${storagePath}`); copyIndex++) {
    storagePath = `${folder}/${baseName}_${copyIndex}.${extension}`
  }
  takenStoragePaths.add(`${bucket}/${storagePath}`)

  plannedUploadByFileName.set(fileName, { fileName, contentType, bucket, storagePath, reason })
}

// ── the rows ──────────────────────────────────────────────────────────────────

const unreadableTables: string[] = []

async function readRows(table: string, columns: string): Promise<TRow[]> {
  const { data, error } = await supabase.from(table).select(columns).limit(10000)
  if (error) {
    unreadableTables.push(table)
    problems.push(`could not read ${table}: ${error.message}`)
    return []
  }
  return (data ?? []) as unknown as TRow[]
}

const userRows = await readRows("23_users", "id,email,avatar_url")
const productRows = await readRows("23_products", "id,price_id,owner_id,translations,img_url,variants,personalization")
const messageRows = await readRows("23_messages", "id,created_at,sender_id,images,sender_avatar_url")
const ticketRows = await readRows("23_tickets", "id,owner_avatar_url")
const designRows = await readRows("23_personalized_designs", "id,user_id,product_id,source_url")
const proposalRows = await readRows("23_ai_price_proposals", "id,proposed_variants")

const emailByUserId = new Map<string, string>()
for (const userRow of userRows) {
  if (typeof userRow.id === "string" && typeof userRow.email === "string") emailByUserId.set(userRow.id, userRow.email)
}

// 1. Product images - the name is rebuilt from the Finnish title and the position in img_url.
for (const productRow of productRows) {
  const ownerEmail = typeof productRow.owner_id === "string" ? emailByUserId.get(productRow.owner_id) : undefined
  const productId = productRow.id
  if (!ownerEmail || typeof productId !== "string") {
    problems.push(`product ${String(productId)} has no owner email in 23_users - its images stay where they are`)
    continue
  }

  const translations = productRow.translations as { fi?: { title?: string } } | null
  const titleSlug = slugify(translations?.fi?.title ?? "") || "product"
  const imageUrls = Array.isArray(productRow.img_url) ? productRow.img_url : []

  imageUrls.forEach((imageUrl, index) => {
    const fileName = selectFileNameFromUrl(imageUrl)
    if (!fileName) return

    const fileNamePriceId = selectPriceIdFromFileName(fileName)
    if (fileNamePriceId && fileNamePriceId !== productRow.price_id) {
      problems.push(`${fileName} names ${fileNamePriceId} but sits on product ${productId} (${String(productRow.price_id)})`)
    }

    planUpload(
      fileName,
      "23_product-images",
      `${slugifyEmail(ownerEmail)}/${productId}`,
      `${titleSlug}-${index + 1}`,
      `23_products.img_url[${index}] of ${productId}`,
    )
  })
}

// 2. Avatars - one file per account, named avatar.<ext> exactly as UpdateAvatarModal writes it.
for (const userRow of userRows) {
  const fileName = selectFileNameFromUrl(userRow.avatar_url)
  if (!fileName || typeof userRow.email !== "string") continue

  planUpload(fileName, "23_avatar-images", slugifyEmail(userRow.email), "avatar", `23_users.avatar_url of ${userRow.email}`)
}

// 3. Support chat images - the message's own created_at is the file name, and whether the sender
//    has a 23_users row decides the bucket.
for (const messageRow of messageRows) {
  const images = Array.isArray(messageRow.images) ? messageRow.images : []
  const senderEmail = typeof messageRow.sender_id === "string" ? emailByUserId.get(messageRow.sender_id) : undefined
  const timestampName = typeof messageRow.created_at === "string" ? selectTimestampName(messageRow.created_at) : "unknown-date"

  for (const image of images) {
    const fileName = selectFileNameFromUrl(image)
    if (!fileName) continue

    planUpload(
      fileName,
      senderEmail ? "23_support-images" : "23_support-guest-images",
      senderEmail ? slugifyEmail(senderEmail) : String(messageRow.sender_id),
      timestampName,
      `23_messages.images of ${String(messageRow.id)}`,
    )
  }
}

// 4. Personalized designs - the buyer picked these through a file picker, so the name the buyer
//    chose is worth keeping, slugged.
for (const designRow of designRows) {
  const fileName = selectFileNameFromUrl(designRow.source_url)
  const buyerEmail = typeof designRow.user_id === "string" ? emailByUserId.get(designRow.user_id) : undefined
  if (!fileName || !buyerEmail || typeof designRow.product_id !== "string") continue

  planUpload(
    fileName,
    "23_product-personalization-images",
    `${slugifyEmail(buyerEmail)}/${designRow.product_id}`,
    slugify(fileName.replace(/\.[^.]+$/, "")) || "design",
    `23_personalized_designs.source_url of ${String(designRow.id)}`,
  )
}

// ── the report ────────────────────────────────────────────────────────────────

function selectNewUrl(fileName: string): string | null {
  const plannedUpload = plannedUploadByFileName.get(fileName)
  return plannedUpload ? `${supabaseUrl}${PUBLIC_STORAGE_PATH_PREFIX}${plannedUpload.bucket}/${plannedUpload.storagePath}` : null
}

const uploadsByBucket = new Map<string, number>()
for (const plannedUpload of plannedUploadByFileName.values()) {
  uploadsByBucket.set(plannedUpload.bucket, (uploadsByBucket.get(plannedUpload.bucket) ?? 0) + 1)
}

console.log(`\n${IS_APPLY_RUN ? "APPLY" : "DRY RUN"} - a dry run writes nothing\n`)
console.log(`files on disk        ${localFilesByName.size}`)
console.log(`planned uploads      ${plannedUploadByFileName.size}`)
for (const [bucket, count] of uploadsByBucket) console.log(`  ${bucket.padEnd(36)}${count}`)

const unreferencedFileNames = [...localFilesByName.keys()].filter(fileName => !plannedUploadByFileName.has(fileName))
console.log(`\nno row points at these  ${unreferencedFileNames.length} (left in the export, nothing links them)`)
for (const fileName of unreferencedFileNames.slice(0, 20)) {
  const priceId = selectPriceIdFromFileName(fileName)
  console.log(`  ${fileName}${priceId ? `   → names ${priceId}` : ""}`)
}
if (unreferencedFileNames.length > 20) console.log(`  … and ${unreferencedFileNames.length - 20} more`)

console.log("\nfirst 15 planned moves:")
for (const plannedUpload of [...plannedUploadByFileName.values()].slice(0, 15)) {
  console.log(`  ${plannedUpload.fileName}\n    → ${plannedUpload.bucket}/${plannedUpload.storagePath}`)
}

if (problems.length) {
  console.log(`\n⚠️  ${problems.length} problems:`)
  for (const problem of problems.slice(0, 40)) console.log(`  ${problem}`)
  if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`)
}

if (!IS_APPLY_RUN) {
  console.log("\nRe-run with --apply to upload the files and update the rows.\n")
  process.exit(0)
}

// A table that would not read is a table whose rows keep pointing at the old project. Uploading
// half the files and relinking half the rows is the one outcome worth refusing outright, because
// the second run would then plan different names for the rows that were skipped.
if (unreadableTables.length) {
  console.error(`\nRefusing to apply: ${unreadableTables.join(", ")} could not be read. Fix that first, then run again.\n`)
  process.exit(1)
}

// ── apply ─────────────────────────────────────────────────────────────────────

let uploadedCount = 0
for (const plannedUpload of plannedUploadByFileName.values()) {
  const { error } = await supabase.storage
    .from(plannedUpload.bucket)
    .upload(plannedUpload.storagePath, fileBytesByName.get(plannedUpload.fileName) ?? Buffer.alloc(0), {
      contentType: plannedUpload.contentType,
      upsert: true,
    })
  if (error) {
    problems.push(`upload failed for ${plannedUpload.bucket}/${plannedUpload.storagePath}: ${error.message}`)
    continue
  }

  uploadedCount++
  if (uploadedCount % 100 === 0) console.log(`  uploaded ${uploadedCount}/${plannedUploadByFileName.size}`)
}
console.log(`\nuploaded ${uploadedCount} files`)

/** Walks a scalar, an array or a JSON object and swaps every URL whose file was uploaded. */
function relinkValue(value: unknown): { value: unknown; changed: boolean } {
  const fileName = selectFileNameFromUrl(value)
  if (fileName) {
    const newUrl = selectNewUrl(fileName)
    return newUrl && newUrl !== value ? { value: newUrl, changed: true } : { value, changed: false }
  }

  if (Array.isArray(value)) {
    const relinkedEntries = value.map(relinkValue)
    return { value: relinkedEntries.map(entry => entry.value), changed: relinkedEntries.some(entry => entry.changed) }
  }

  if (value && typeof value === "object") {
    const relinkedEntries = Object.entries(value).map(([key, nestedValue]) => [key, relinkValue(nestedValue)] as const)
    return {
      value: Object.fromEntries(relinkedEntries.map(([key, entry]) => [key, entry.value])),
      changed: relinkedEntries.some(([, entry]) => entry.changed),
    }
  }

  return { value, changed: false }
}

async function relinkTable(table: string, rows: TRow[], urlColumns: string[]): Promise<void> {
  let updatedCount = 0

  for (const row of rows) {
    const columns: TRow = {}
    for (const column of urlColumns) {
      const relinked = relinkValue(row[column])
      if (relinked.changed) columns[column] = relinked.value
    }
    if (Object.keys(columns).length === 0) continue

    const { error } = await supabase.from(table).update(columns).eq("id", String(row.id))
    if (error) {
      problems.push(`update failed for ${table} ${String(row.id)}: ${error.message}`)
      continue
    }
    updatedCount++
  }

  console.log(`${table.padEnd(28)}${updatedCount} rows relinked`)
}

await relinkTable("23_products", productRows, ["img_url", "variants", "personalization"])
await relinkTable("23_users", userRows, ["avatar_url"])
await relinkTable("23_messages", messageRows, ["images", "sender_avatar_url"])
await relinkTable("23_tickets", ticketRows, ["owner_avatar_url"])
await relinkTable("23_personalized_designs", designRows, ["source_url"])
await relinkTable("23_ai_price_proposals", proposalRows, ["proposed_variants"])

// Supabase Auth keeps its own copy of the avatar URL in user_metadata, and the app reads it on
// sign-in, so it is rewritten here too.
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (authError) problems.push(`could not read auth users: ${authError.message}`)

let authUpdatedCount = 0
for (const authUser of authUsers?.users ?? []) {
  const relinked = relinkValue(authUser.user_metadata?.avatar_url)
  if (!relinked.changed) continue

  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    user_metadata: { ...authUser.user_metadata, avatar_url: relinked.value },
  })
  if (error) {
    problems.push(`auth metadata update failed for ${authUser.id}: ${error.message}`)
    continue
  }
  authUpdatedCount++
}
console.log(`auth.users metadata         ${authUpdatedCount} rows relinked`)

if (problems.length) {
  console.log(`\n⚠️  ${problems.length} problems in total:`)
  for (const problem of problems) console.log(`  ${problem}`)
}
console.log("\nDone. Delete backup.ts once the shop shows its images.\n")
