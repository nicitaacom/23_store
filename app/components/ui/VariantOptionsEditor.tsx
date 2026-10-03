"use client"

import { useId, useState } from "react"

import { cleanVariantOptions } from "@/utils/variantOptions"
import { useScopedI18n } from "@/locales/client"

interface VariantOptionsEditorProps {
  options: Record<string, string>
  onChange: (options: Record<string, string>) => void
  disabled?: boolean
}

export function VariantOptionsEditor({ options, onChange, disabled = false }: VariantOptionsEditorProps) {
  const t = useScopedI18n("product")
  const suggestionsId = useId()
  const [name, setName] = useState("")
  const [value, setValue] = useState("")

  function addOption() {
    const standardNames = ["Color", "Size", "Weight"]
    const translatedNames = [t("variant_color"), t("variant_size"), t("variant_weight")]
    const standardIndex = translatedNames.findIndex(translatedName => translatedName.toLowerCase() === name.trim().toLowerCase())
    const storedName = standardIndex >= 0 ? standardNames[standardIndex] : name
    const cleaned = cleanVariantOptions({ [storedName]: value })
    const optionName = Object.keys(cleaned)[0]
    if (!optionName) return
    onChange({ ...options, [optionName]: cleaned[optionName] })
    setName("")
    setValue("")
  }

  return (
    <div className="grid gap-2 rounded border border-border-color/30 bg-background/30 p-2">
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
          value={value}
        />
        <button
          className="rounded border border-success/35 px-3 py-1.5 text-sm text-success disabled:opacity-40"
          disabled={disabled || !name.trim() || !value.trim() || Object.keys(options).length >= 8}
          onClick={addOption}
          type="button">
          {t("variant_option_add")}
        </button>
      </div>
      {Object.entries(options).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(options).map(([optionName, optionValue]) => (
            <button
              aria-label={`${optionName}: ${optionValue} ×`}
              className="rounded border border-success/30 bg-success/10 px-2 py-1 text-xs text-title"
              disabled={disabled}
              key={optionName}
              onClick={() => onChange(Object.fromEntries(Object.entries(options).filter(([key]) => key !== optionName)))}
              title={t("remove")}
              type="button">
              {optionName === "Color" ? t("variant_color") : optionName === "Size" ? t("variant_size") : optionName === "Weight" ? t("variant_weight") : optionName}: {optionValue} ×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
