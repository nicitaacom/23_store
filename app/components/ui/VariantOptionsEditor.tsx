"use client"

import { useId, useRef, useState } from "react"

import type { TVariantOptionValues } from "@/ts/product/TProductVariant"
import { cleanVariantOptions } from "@/utils/variantOptions"
import { useScopedI18n } from "@/locales/client"

interface VariantOptionsEditorProps {
  variantLabel: string
  options: TVariantOptionValues
  onChange: (options: TVariantOptionValues) => void
  disabled?: boolean
}

export function VariantOptionsEditor({ variantLabel, options, onChange, disabled = false }: VariantOptionsEditorProps) {
  const t = useScopedI18n("product")
  const suggestionsId = useId()
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const valueInputRef = useRef<HTMLInputElement>(null)
  const standardNames = ["Color", "Size", "Weight"]
  const translatedNames = [t("variant_color"), t("variant_size"), t("variant_weight")]
  const standardIndex = translatedNames.findIndex(translatedName => translatedName.toLowerCase() === name.trim().toLowerCase())
  const storedName = standardIndex >= 0 ? standardNames[standardIndex] : name.trim()
  const optionNameForInput = Object.keys(options).find(existingName => existingName.toLowerCase() === storedName.toLowerCase()) ?? storedName
  const isNewNameAtLimit = Object.keys(options).length >= 8 && !Object.keys(options).includes(optionNameForInput)
  const existingValues = Object.prototype.hasOwnProperty.call(options, optionNameForInput) ? options[optionNameForInput] : []
  const isDuplicateValue = existingValues.includes(value.trim())
  const isInvalidName = optionNameForInput === "__proto__"

  function addOption() {
    if (isNewNameAtLimit || isDuplicateValue || isInvalidName) return
    const cleaned = cleanVariantOptions({ [optionNameForInput]: value })
    const cleanedName = Object.keys(cleaned)[0]
    if (!cleanedName) return
    const nextValue = cleaned[cleanedName]
    onChange({ ...options, [cleanedName]: [...existingValues, nextValue] })
    setValue("")
    valueInputRef.current?.focus()
  }

  return (
    <div className="grid gap-2 rounded border border-border-color/30 bg-background/30 p-2">
      <p className="min-w-0 truncate text-xs font-semibold text-title">
        {variantLabel.trim() ? t("variant_options_for", { variant: variantLabel.trim() }) : t("variant_options_for_new")}
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label={t("variant_option_name")}
          className="min-w-28 flex-1 rounded border border-border-color/35 bg-background px-2 py-1.5 text-sm text-title"
          disabled={disabled}
          list={suggestionsId}
          maxLength={40}
          onChange={event => setName(event.target.value)}
          placeholder={t("variant_option_name")}
          value={name}
        />
        <datalist id={suggestionsId}>
          <option value={t("variant_color")} />
          <option value={t("variant_size")} />
          <option value={t("variant_weight")} />
        </datalist>
        <input
          aria-label={t("variant_option_value")}
          className="min-w-28 flex-1 rounded border border-border-color/35 bg-background px-2 py-1.5 text-sm text-title"
          disabled={disabled}
          maxLength={80}
          onChange={event => setValue(event.target.value)}
          placeholder={t("variant_option_value")}
          ref={valueInputRef}
          value={value}
        />
        <button
          className="rounded border border-success/35 px-3 py-1.5 text-sm text-success disabled:opacity-40"
          disabled={disabled || !name.trim() || !value.trim() || isNewNameAtLimit || isDuplicateValue || isInvalidName}
          onClick={addOption}
          type="button">
          {t("variant_option_add")}
        </button>
      </div>
      {Object.entries(options).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(options).flatMap(([optionName, optionValues]) => optionValues.map(optionValue => (
            <button
              aria-label={`${optionName}: ${optionValue} ×`}
              className="rounded border border-success/30 bg-success/10 px-2 py-1 text-xs text-title"
              disabled={disabled}
              key={`${optionName}:${optionValue}`}
              onClick={() => {
                const remainingValues = optionValues.filter(value => value !== optionValue)
                if (remainingValues.length) onChange({ ...options, [optionName]: remainingValues })
                else onChange(Object.fromEntries(Object.entries(options).filter(([name]) => name !== optionName)))
              }}
              title={t("remove")}
              type="button">
              {optionName === "Color" ? t("variant_color") : optionName === "Size" ? t("variant_size") : optionName === "Weight" ? t("variant_weight") : optionName}: {optionValue} ×
            </button>
          )))}
        </div>
      )}
    </div>
  )
}
