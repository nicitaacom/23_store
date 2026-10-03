import type { TProductVariant, TVariantOptionValues } from "@/ts/product/TProductVariant"
import { MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"

export function cleanVariantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const options: Record<string, string> = {}
  for (const [rawName, rawValue] of Object.entries(value)) {
    if (typeof rawValue !== "string") continue
    const name = rawName.trim().slice(0, 40)
    const optionValue = rawValue.trim().slice(0, 80)
    if (name && optionValue && name !== "__proto__" && Object.keys(options).length < 8) options[name] = optionValue
  }
  return options
}

export function toVariantOptionValues(options: Record<string, string> | undefined): TVariantOptionValues {
  return Object.fromEntries(Object.entries(cleanVariantOptions(options)).map(([name, value]) => [name, [value]]))
}

export function expandVariantOptionValues(options: TVariantOptionValues): Record<string, string>[] {
  let combinations: Record<string, string>[] = [{}]
  for (const [rawName, rawValues] of Object.entries(options)) {
    if (!Array.isArray(rawValues)) continue
    const cleanedValues = [...new Set(rawValues.flatMap(rawValue => {
      const cleaned = cleanVariantOptions({ [rawName]: rawValue })
      return Object.values(cleaned)
    }))]
    if (!cleanedValues.length) continue
    const name = rawName.trim().slice(0, 40)
    combinations = combinations.flatMap(combination => cleanedValues.map(value => ({ ...combination, [name]: value })))
      .slice(0, MAX_PRODUCT_VARIANTS + 1)
  }
  return combinations
}

export function labelForVariantCombination(label: string, options: Record<string, string>, index: number) {
  return index === 0 ? label : `${label} / ${Object.entries(options).map(([name, value]) => `${name}: ${value}`).join(" / ")}`
}

export function getVariantOptionGroups(variants: TProductVariant[]) {
  const groups = new Map<string, string[]>()
  for (const variant of variants) {
    for (const [name, value] of Object.entries(cleanVariantOptions(variant.options))) {
      const values = groups.get(name) ?? []
      if (!values.includes(value)) values.push(value)
      groups.set(name, values)
    }
  }
  return [...groups].map(([name, values]) => ({ name, values }))
}

export function chooseVariantForOption(variants: TProductVariant[], selected: TProductVariant | undefined, name: string, value: string) {
  const candidates = variants.filter(variant => variant.options?.[name] === value)
  return candidates.sort((first, second) => {
    const matches = (variant: TProductVariant) =>
      Object.entries(selected?.options ?? {}).filter(([otherName, otherValue]) =>
        otherName !== name && variant.options?.[otherName] === otherValue,
      ).length
    return matches(second) - matches(first) || Number(second.quantity > 0) - Number(first.quantity > 0)
  })[0]
}
