import { formatFileNameForBucket } from "./formatFileNameForBucket"
import { TBuckets } from "@/TS/TBuckets"
import supabaseClient from "@/libs/supabase/supabaseClient"

interface UploadImageParams {
  imageFile: File
  bucket: TBuckets
  folder?: string
  suffix?: string
}

/**
 *
 * @param imageFile - File type (make sure it exist and not undefined - if so - return string (error message))
 * @param folder - folder (category) e.g Main dishes
 * @param suffix - something after file name e.g fileName_price_id_d4rg3f2d
 * @returns - publicUrl for image
 * NOTE: To avoid "Only plain objects, and a few built-ins, can be passed to Server Actions" error - make sure that it is NOT server action
 * Because as I undertand it don't like that fact that I pass File here
 */
export async function uploadImageFn({
  imageFile,
  bucket,
  folder,
  suffix,
}: UploadImageParams): Promise<string | { publicUrl: string }> {
  if (!imageFile) return "Image file is missing"

  // console.log("🔍 DEBUG - side parameter:", side)

  let cleanedFileName = formatFileNameForBucket(imageFile.name, folder, suffix)
  if (typeof cleanedFileName === "string") return cleanedFileName

  // 1. Extract folder path & filename parts
  const folderPath = folder ? `${folder}/` : ""
  const [baseName, ext] = cleanedFileName[0].split(/\.(?=[^\.]+$)/) // split at last dot

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

  while (matching.some(f => f.name === `${baseName}_${index}.${ext}`)) index++
  if (matching.some(f => f.name === `${baseName}.${ext}`)) finalFileName = `${baseName}_${index}.${ext}`

  // 6. Optional: log what’s going on
  console.log(`🧠 Existing variants: ${matching.map(f => f.name).join(", ")}`)
  console.log(`✅ Final file name: ${finalFileName}`)

  // 7. Upload
  const { data, error } = await supabaseClient.storage.from(bucket).upload(`${folderPath}${finalFileName}`, imageFile, {
    upsert: false,
  })
  if (error?.message) return error?.message
  if (!data) return "No data returned from uploaded image"

  // 5. Get public URL
  const { data: public_url } = supabaseClient.storage.from(bucket).getPublicUrl(data.path)
  return { publicUrl: public_url.publicUrl }
}
