"use client"

import type { TProductVariant } from "@/ts/product/TProductVariant"
import { chooseVariantForOption, getVariantOptionGroups } from "@/utils/variantOptions"
import { useScopedI18n } from "@/locales/client"

interface VariantOptionPickerProps {
  variants: TProductVariant[]
  selectedVariant: TProductVariant | undefined
  onSelect: (variantId: string) => void
}

export function VariantOptionPicker({ variants, selectedVariant, onSelect }: VariantOptionPickerProps) {
  const t = useScopedI18n("product")
  const groups = getVariantOptionGroups(variants)
  if (!groups.length) return null

  return (
    <div className="grid gap-2">
      {groups.map(group => (
        <fieldset className="min-w-0" key={group.name}>
          <legend className="mb-1 text-xs font-semibold text-title">
            {group.name === "Color" ? t("variant_color") : group.name === "Size" ? t("variant_size") : group.name === "Weight" ? t("variant_weight") : group.name}: {selectedVariant?.options?.[group.name] ?? ""}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {group.values.map(value => {
              const isSelected = selectedVariant?.options?.[group.name] === value
              return (
                <button
                  aria-pressed={isSelected}
                  className={isSelected
                    ? "rounded border-2 border-success bg-success/15 px-3 py-1.5 text-sm font-semibold text-title shadow-[0_0_0_2px_rgba(34,197,94,0.15)]"
                    : "rounded border border-border-color/40 bg-background/50 px-3 py-1.5 text-sm text-subTitle hover:border-success/50"}
                  key={value}
                  onClick={() => {
                    const nextVariant = chooseVariantForOption(variants, selectedVariant, group.name, value)
                    if (nextVariant) onSelect(nextVariant.id)
                  }}
                  type="button">
                  {value}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
