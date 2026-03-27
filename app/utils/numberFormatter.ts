const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function parseFormattedNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN

  const normalizedValue = value.replaceAll(",", "").trim()
  if (!normalizedValue) return Number.NaN

  return Number(normalizedValue)
}

export function formatNumber(value: number | string | null | undefined) {
  const parsedValue = parseFormattedNumber(value)
  if (!Number.isFinite(parsedValue)) return ""

  return NUMBER_FORMATTER.format(parsedValue)
}

export function formatGroupedNumberInput(value: string) {
  const sanitizedValue = value.replaceAll(",", "").replace(/[^\d.]/g, "")
  if (!sanitizedValue) return ""

  const hasDecimalSeparator = sanitizedValue.includes(".")
  const [integerPartRaw, decimalPartRaw = ""] = sanitizedValue.split(".")
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "")

  if (!integerPart) return ""

  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const decimalPart = decimalPartRaw.replace(/\./g, "").slice(0, 2)

  if (hasDecimalSeparator) {
    return `${groupedIntegerPart}.${decimalPart}`
  }

  return groupedIntegerPart
}
