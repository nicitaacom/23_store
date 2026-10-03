import type { TProductVariant } from "@/ts/product/TProductVariant"

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
