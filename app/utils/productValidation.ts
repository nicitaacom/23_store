import { MAX_PRODUCT_DESCRIPTION_LENGTH, MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"

export const PRODUCT_TITLE_INVALID_CHARACTER_REGEX = /[^A-Za-z0-9#$()_+ /,.'-]/
export const PRODUCT_TITLE_HAS_LETTER_REGEX = /[A-Za-z]/
export const PRODUCT_TITLE_MUST_START_REGEX = /^[A-Za-z0-9]/

export const PRODUCT_TITLE_PATTERN = new RegExp(
  `^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9#$()_+ /,.'-]{${MIN_PRODUCT_TITLE_LENGTH - 1},${MAX_PRODUCT_TITLE_LENGTH - 1}}$`,
)

export const PRODUCT_DESCRIPTION_PATTERN = new RegExp(
  "^[-:.,()#@&%\\/\"'`~\\[\\]><=+!?*_;a-zA-Z0-9\\n ]{1," + MAX_PRODUCT_DESCRIPTION_LENGTH + "}$",
)
