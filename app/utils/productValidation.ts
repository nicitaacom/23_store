import { MAX_PRODUCT_DESCRIPTION_LENGTH, MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"

export const PRODUCT_TITLE_INVALID_CHARACTER_REGEX = /[^A-Za-z0-9#%$()_+&/,.''\-= |–]/
export const PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX = /[^-:.,()#@&%\/"'`~\[\]|><=+!?*_;a-zA-Z0-9\n °]/
export const PRODUCT_TITLE_HAS_LETTER_REGEX = /[A-Za-z]/
export const PRODUCT_TITLE_MUST_START_REGEX = /^[A-Za-z0-9]/

export const PRODUCT_TITLE_PATTERN = new RegExp(
  `^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 |–#%$()_+&/,.''\-=]{${MIN_PRODUCT_TITLE_LENGTH - 1},${MAX_PRODUCT_TITLE_LENGTH - 1}}$`,
)

export const PRODUCT_DESCRIPTION_PATTERN = new RegExp(
  "^[-:.,()#@&%\\/\"'`~\\[\\]|><=+!?*_;a-zA-Z0-9\\n °]{1," + MAX_PRODUCT_DESCRIPTION_LENGTH + "}$",
)

export function getInvalidCharacterContext(value: string, invalidCharacterIndex: number) {
  const wordsBeforeInvalidCharacter = value
    .slice(0, invalidCharacterIndex)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .join(" ")

  if (wordsBeforeInvalidCharacter) return wordsBeforeInvalidCharacter

  const wordsAfterInvalidCharacter = value
    .slice(invalidCharacterIndex + 1)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")

  if (wordsAfterInvalidCharacter) return wordsAfterInvalidCharacter

  return value.slice(Math.max(0, invalidCharacterIndex - 6), Math.min(value.length, invalidCharacterIndex + 7)).trim()
}

export function getReadableCharacter(character: string) {
  if (character === "\n") return "newline"
  if (character === "\t") return "tab"
  return character
}

export function getInvalidCharacterDetails(value: string, invalidCharacterRegex: RegExp) {
  const invalidCharacterMatch = value.match(invalidCharacterRegex)
  if (!invalidCharacterMatch || invalidCharacterMatch.index === undefined) return null

  return {
    character: getReadableCharacter(invalidCharacterMatch[0]),
    context: getInvalidCharacterContext(value, invalidCharacterMatch.index),
  }
}
