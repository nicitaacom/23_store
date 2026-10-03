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

type VariantOptionDraft = { id: string; label: string; group_id?: string; options?: TVariantOptionValues }

export function groupVariantDrafts<T extends VariantOptionDraft>(drafts: T[]): T[][] {
  const groups = new Map<string, T[]>()
  for (const draft of drafts) {
    const groupId = draft.group_id ?? draft.id
    groups.set(groupId, [...(groups.get(groupId) ?? []), draft])
  }
  return [...groups.values()]
}

export function getVariantGroupLabel(group: VariantOptionDraft[]) {
  const first = group[0]
  if (!first) return ""
  const options = Object.entries(first.options ?? {}).map(([name, values]) => `${name}: ${values[0]}`).join(" / ")
  const generatedSuffix = options ? ` / ${options}` : ""
  return generatedSuffix && first.label.endsWith(generatedSuffix)
    ? first.label.slice(0, -generatedSuffix.length)
    : first.label
}

export function getVariantGroupOptions(group: VariantOptionDraft[]): TVariantOptionValues {
  const options: TVariantOptionValues = {}
  for (const draft of group) {
    for (const [name, values] of Object.entries(draft.options ?? {})) {
      options[name] = [...new Set([...(options[name] ?? []), ...values])]
    }
  }
  return options
}

function variantCombinationKey(options: Record<string, string>) {
  return JSON.stringify(Object.entries(options).sort(([firstName], [secondName]) => firstName.localeCompare(secondName)))
}

export function updateVariantGroupOptions<T extends VariantOptionDraft>(drafts: T[], groupId: string, options: TVariantOptionValues): T[] {
  const group = drafts.filter(draft => (draft.group_id ?? draft.id) === groupId)
  const first = group[0]
  if (!first) return drafts

  const label = getVariantGroupLabel(group)
  const combinations = expandVariantOptionValues(options)
  const updated = combinations.map((combination, index) => {
    const existing = group.find(draft => variantCombinationKey(expandVariantOptionValues(draft.options ?? {})[0]) === variantCombinationKey(combination))
      ?? (index === 0 && group.length === 1 && (!Object.keys(first.options ?? {}).length || !Object.keys(combination).length) ? first : undefined)
    return {
      ...(existing ?? first),
      id: existing?.id ?? crypto.randomUUID(),
      label,
      options: toVariantOptionValues(combination),
      group_id: groupId,
    }
  })
  const firstIndex = drafts.findIndex(draft => (draft.group_id ?? draft.id) === groupId)
  return drafts.flatMap((draft, index) => index === firstIndex ? updated : (draft.group_id ?? draft.id) === groupId ? [] : [draft])
}

export function groupProductVariants(variants: TProductVariant[]): TProductVariant[][] {
  const groups = new Map<string, TProductVariant[]>()
  for (const variant of variants) {
    const groupId = variant.group_id ?? variant.id
    groups.set(groupId, [...(groups.get(groupId) ?? []), variant])
  }
  return [...groups.values()]
}

export function getProductVariantGroupLabel(variant: TProductVariant) {
  const options = Object.entries(cleanVariantOptions(variant.options)).map(([name, value]) => `${name}: ${value}`).join(" / ")
  const generatedSuffix = options ? ` / ${options}` : ""
  return generatedSuffix && variant.label.endsWith(generatedSuffix)
    ? variant.label.slice(0, -generatedSuffix.length)
    : variant.label
}

export function getProductVariantSelectionLabel(variant: TProductVariant) {
  const options = Object.entries(cleanVariantOptions(variant.options)).map(([name, value]) => `${name}: ${value}`).join(" / ")
  return options ? `${getProductVariantGroupLabel(variant)} / ${options}` : getProductVariantGroupLabel(variant)
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
    const sameGroup = (variant: TProductVariant) => Number(Boolean(selected?.group_id && variant.group_id === selected.group_id))
    const matches = (variant: TProductVariant) =>
      Object.entries(selected?.options ?? {}).filter(([otherName, otherValue]) =>
        otherName !== name && variant.options?.[otherName] === otherValue,
      ).length
    return sameGroup(second) - sameGroup(first) || matches(second) - matches(first) || Number(second.quantity > 0) - Number(first.quantity > 0)
  })[0]
}
