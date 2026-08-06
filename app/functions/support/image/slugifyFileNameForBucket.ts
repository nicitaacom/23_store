import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { slugify } from "@/utils/slugify"

// A file with no readable name of its own still needs one, so the extension is kept and the base
// falls back to this: an emoji-only name slugs to "" and would otherwise start the path with ".".
const FALLBACK_BASE_NAME = "image"

/**
 * A file name a Storage path can hold as-is: lowercase, transliterated, "%" spelled as "pct", and
 * every run of anything else collapsed to one "-" - "Сливки 30%.JPG" becomes "slivki-30pct.jpg".
 *
 * Ensure to keep the file extension intact to avoid issues when downloading .zip files from Supabase
 * (files may not have extensions), leading to errors when dragging and dropping them.
 *
 * Returns the name inside a 1-item array, or a string with the error - the caller separates the two
 * with `typeof`.
 */
export function slugifyFileNameForBucket(t: TI18nFunction, fileName: string): string | [string] {
  const lastDot = fileName.lastIndexOf(".")
  if (lastDot < 1) return t("support.error.filename_must_contain_dot") // it allows image.dep.png

  const extension = slugify(fileName.slice(lastDot + 1))
  if (!extension) return t("support.error.file_extension_is_required")

  const baseName = slugify(fileName.slice(0, lastDot)) || FALLBACK_BASE_NAME

  return [`${baseName}.${extension}`]
}
