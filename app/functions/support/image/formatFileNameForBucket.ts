import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

export function formatFileNameForBucket(t: TI18nFunction, fileName: string, suffix_?: string): string | [string] {
  // Ensure to keep the file extension intact to avoid issues when downloading .zip files from Supabase
  // (files may not have extensions), leading to errors when dragging and dropping them.

  // 2. Find last dot and validate
  const lastDot = fileName.lastIndexOf(".")
  if (lastDot < 1) return t("support.error.filename_must_contain_dot") // it allows image.dep.png

  // 3. Split base & ext
  const base = fileName.slice(0, lastDot) // e.g image
  const extension = fileName.slice(lastDot + 1).toLowerCase() // e.g png
  if (!extension) return t("support.error.file_extension_is_required")

  // "Hello-World!_@example #2023 30%" becomes "Hello World 2023 30%" then "Hello-world 2023 30"
  const cleanedBaseName = base
    .replace(/[_\s\-()%{}\[\]öäüßçàáâãèéêëìíîïòóôõùúûü]+/gi, " ") // replace _ßS with one space
    .replace(/[^a-zA-Z0-9 :.\-]/g, "") // ✅ Allow only lettersA, numbers7, spaces , . and : and dashes- to fix this https://i.imgur.com/X0uNCF7.png
    .replace(/\s+/g, " ") // 🔁 Normalize multiple spaces to single space
    .replace(/^./, firstChar => firstChar.toUpperCase()) // Capitalize first letter only - allow other words to be capitalized e.g Pizza margherita Italy edition
    .trim() // ✂️ Remove leading/trailing spaces

  const suffix = `${suffix_ ? `_${suffix_}` : ""}`

  // Construct final file name e.g Hello world 2023 30.png
  const finalFileName = `${cleanedBaseName}${suffix}.${extension.toLowerCase()}`

  return [finalFileName]
}
