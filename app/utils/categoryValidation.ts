// Letters, numbers, spaces, apostrophes, hyphens, ampersands, commas, periods — 2–255 chars
export const CATEGORY_NAME_REGEX = /^[A-Za-z0-9 '&,.\-]{2,255}$/

export const isValidCategoryName = (value: unknown): value is string =>
  typeof value === "string" && CATEGORY_NAME_REGEX.test(value.trim())
