import { MAX_PRODUCT_DESCRIPTION_LENGTH, MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"

export const PRODUCT_TITLE_INVALID_CHARACTER_REGEX = /[^\p{L}\p{N}#%$()_+&/,.''\-= |–:]/u
export const PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX = /[^-:.,()#@&%\/"'`~\[\]|><=+!?*_;\p{L}\p{N}\n °]/u
export const PRODUCT_TITLE_HAS_LETTER_REGEX = /\p{L}/u
export const PRODUCT_TITLE_MUST_START_REGEX = /^[\p{L}\p{N}]/u

export const PRODUCT_TITLE_PATTERN = new RegExp(
  `^(?=.*\\p{L})[\\p{L}\\p{N}][\\p{L}\\p{N} |–#%$()_+&/,.''\-=:]{${MIN_PRODUCT_TITLE_LENGTH - 1},${MAX_PRODUCT_TITLE_LENGTH - 1}}$`,
  "u",
)

export const PRODUCT_DESCRIPTION_PATTERN = new RegExp(
  "^[-:.,()#@&%\\/\"'`~\\[\\]|><=+!?*_;\\p{L}\\p{N}\\n °]{1," + MAX_PRODUCT_DESCRIPTION_LENGTH + "}$",
  "u",
)

export function getInvalidCharacterContext(value: string, invalidCharacterIndex: number) {
  const invalidChar = value[invalidCharacterIndex]
  const wordsAfterInvalidCharacter = value
    .slice(invalidCharacterIndex + 1)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")

  if (wordsAfterInvalidCharacter) return `${invalidChar} ${wordsAfterInvalidCharacter}`

  const wordsBeforeInvalidCharacter = value
    .slice(0, invalidCharacterIndex)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .join(" ")

  if (wordsBeforeInvalidCharacter) return `${wordsBeforeInvalidCharacter} ${invalidChar}`

  return value.slice(Math.max(0, invalidCharacterIndex - 6), Math.min(value.length, invalidCharacterIndex + 7)).trim()
}

export function getReadableCharacter(character: string) {
  if (character === "\n") return "newline"
  if (character === "\t") return "tab"
  return character
}

export function validateDescription(value: unknown): string | true {
  const description = String(value ?? "").replace(/\r/g, "")
  if (!description.trim()) return true
  const details = getInvalidCharacterDetails(description, PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX)
  if (details) return `Character "${details.character}" is not allowed near "${details.context}"`
  return true
}

export function getInvalidCharacterDetails(value: string, invalidCharacterRegex: RegExp) {
  const invalidCharacterMatch = value.match(invalidCharacterRegex)
  if (!invalidCharacterMatch || invalidCharacterMatch.index === undefined) return null

  return {
    character: getReadableCharacter(invalidCharacterMatch[0]),
    context: getInvalidCharacterContext(value, invalidCharacterMatch.index),
  }
}
