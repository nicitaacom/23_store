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

// http://localhost:6006/?path=/story/admin-adminpanelmodal--edit-grouped-sizes
export function VariantOptionsEditor({ variantLabel, options, onChange, disabled = false }: VariantOptionsEditorProps) {
  const t = useScopedI18n("product")
  const suggestionsId = useId()
  const [nameValue, setNameValue] = useState("")
  const [optionTextValue, setOptionTextValue] = useState("")
  const valueInputRef = useRef<HTMLInputElement>(null)
  const standardNames = ["Color", "Size", "Weight"]
  const translatedNames = [t("variant_color"), t("variant_size"), t("variant_weight")]
  const standardIndex = translatedNames.findIndex(translatedName => translatedName.toLowerCase() === nameValue.trim().toLowerCase())
  const storedName = standardIndex >= 0 ? standardNames[standardIndex] : nameValue.trim()
  const optionNameForInput = Object.keys(options).find(existingName => existingName.toLowerCase() === storedName.toLowerCase()) ?? storedName
  const isNewNameAtLimit = Object.keys(options).length >= 8 && !Object.keys(options).includes(optionNameForInput)
  const existingValues = Object.prototype.hasOwnProperty.call(options, optionNameForInput) ? options[optionNameForInput] : []
  const isDuplicateValue = existingValues.includes(optionTextValue.trim())
  const isInvalidName = optionNameForInput === "__proto__"

  function addOption() {
    if (isNewNameAtLimit || isDuplicateValue || isInvalidName) return
    const cleaned = cleanVariantOptions({ [optionNameForInput]: optionTextValue })
    const cleanedName = Object.keys(cleaned)[0]
    if (!cleanedName) return
    const nextValue = cleaned[cleanedName]
    onChange({ ...options, [cleanedName]: [...existingValues, nextValue] })
    setOptionTextValue("")
    valueInputRef.current?.focus()
  }

  return (
    <div className="halloween-options grid gap-2 rounded border border-border-color/55 bg-background/40 p-2">
      <p className="min-w-0 truncate text-xs font-semibold text-title">
        {variantLabel.trim() ? t("variant_options_for", { variant: variantLabel.trim() }) : t("variant_options_for_new")}
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-28 flex-1 rounded border border-border-color/60 bg-background px-2 py-1.5 text-sm text-title outline-none transition-shadow placeholder:text-subTitle focus:border-success focus:ring-2 focus:ring-success/60"
          aria-label={t("variant_option_name")}
          disabled={disabled}
          list={suggestionsId}
          maxLength={40}
          onChange={event => setNameValue(event.target.value)}
          placeholder={t("variant_option_name")}
          value={nameValue}
        />
        <datalist id={suggestionsId}>
          <option value={t("variant_color")} />
          <option value={t("variant_size")} />
          <option value={t("variant_weight")} />
        </datalist>
        <input
          className="min-w-28 flex-1 rounded border border-border-color/60 bg-background px-2 py-1.5 text-sm text-title outline-none transition-shadow placeholder:text-subTitle focus:border-success focus:ring-2 focus:ring-success/60"
          aria-label={t("variant_option_value")}
          disabled={disabled}
          maxLength={80}
          onChange={event => setOptionTextValue(event.target.value)}
          placeholder={t("variant_option_value")}
          ref={valueInputRef}
          value={optionTextValue}
        />
        <button
          className="rounded border border-success/60 px-3 py-1.5 text-sm font-medium text-success outline-none transition-colors hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-success/70 disabled:opacity-40"
          disabled={disabled || !nameValue.trim() || !optionTextValue.trim() || isNewNameAtLimit || isDuplicateValue || isInvalidName}
          onClick={addOption}
          type="button">
          {t("variant_option_add")}
        </button>
      </div>
      {Object.entries(options).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(options).flatMap(([optionName, optionValues]) => optionValues.map(optionValue => (
            <button
              className="rounded border border-success/50 bg-success/10 px-2 py-1 text-xs text-title outline-none hover:bg-success/20 focus-visible:ring-2 focus-visible:ring-success/70"
              aria-label={`${optionName}: ${optionValue} ×`}
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
