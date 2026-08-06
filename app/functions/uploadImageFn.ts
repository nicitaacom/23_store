import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TBuckets } from "@/ts/types/TBuckets"
import { slugifyFileNameForBucket } from "./support/image/slugifyFileNameForBucket"
import supabaseClient from "@/libs/supabase/supabaseClient"

interface UploadImageParams {
  t: TI18nFunction
  imageFile: File
  bucket: TBuckets
  folder?: string
  suffix?: string
  upsert?: boolean
}

/**
 *
 * @param imageFile - File type (make sure it exist and not undefined - if so - return string (error message))
 * @param folder - folder (category) e.g Main dishes
 * @param suffix - something after file name e.g fileName_price_id_d4rg3f2d
 * @returns - publicUrl for image
 * NOTE: To avoid "Only serializable objects, and a few built-ins, can be passed to Server Actions" error - make sure that it is NOT server action
 * Because as I undertand it don't like that fact that I pass File here
 */
export async function uploadImageFn({
  t,
  imageFile,
  bucket,
  folder,
  suffix,
  upsert = false,
}: UploadImageParams): Promise<string | { publicUrl: string }> {
  if (!imageFile) return "Image file is missing"

  const cleanedFileName = slugifyFileNameForBucket(t, imageFile.name, suffix)
  if (typeof cleanedFileName === "string") return cleanedFileName

  // 1. Extract folder path & filename parts
  const folderPath = folder ? `${folder}/` : ""
  const [baseName, ext] = cleanedFileName[0].split(/\.(?=[^\.]+$)/) // split at last dot

  if (upsert) {
    const finalFileName = `${baseName}.${ext}`
    const { data, error } = await supabaseClient.storage.from(bucket).upload(`${folderPath}${finalFileName}`, imageFile, {
      upsert: true,
    })
    if (error?.message) return error?.message
    if (!data) return t("product.error.no_data_returned_from_uploaded_image")

    const { data: public_url } = supabaseClient.storage.from(bucket).getPublicUrl(data.path)
    return { publicUrl: public_url.publicUrl }
  }

  const { data: existingFiles, error: listError } = await supabaseClient.storage.from(bucket).list(folderPath)
  if (listError) return `Can't list files in ${folderPath || `Supabase bucket "${bucket}"`} – ${listError.message}`

  // 3. Normalize base name to detect duplicates
  const normalize = (name: string) =>
    name
      .replace(/[_\s-]+/g, " ")
      .replace(/[^a-zA-Z0-9 %]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()

  const normalizedTarget = normalize(baseName)

  // 4. Filter matching files
  const matching = (existingFiles ?? []).filter(file => {
    const [existingBase] = file.name.split(/\.(?=[^\.]+$)/)
    return normalize(existingBase).startsWith(normalizedTarget)
  })

  // 5. Determine unique suffix
  let index = 1
  let finalFileName = `${baseName}.${ext}`

  while (matching.some(file => file.name === `${baseName}_${index}.${ext}`)) index++
  if (matching.some(file => file.name === `${baseName}.${ext}`)) finalFileName = `${baseName}_${index}.${ext}`

  // 6. Optional: log what’s going on
  console.log(`🧠 Existing variants: ${matching.map(file => file.name).join(", ")}`)
  console.log(`✅ Final file name: ${finalFileName}`)

  // 7. Upload
  const { data, error } = await supabaseClient.storage.from(bucket).upload(`${folderPath}${finalFileName}`, imageFile, {
    upsert: false,
  })
  if (error?.message) return error?.message
  if (!data) return t("product.error.no_data_returned_from_uploaded_image")

  // 5. Get public URL
  const { data: public_url } = supabaseClient.storage.from(bucket).getPublicUrl(data.path)
  return { publicUrl: public_url.publicUrl }
}
