"use client"

import { useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"

import { useLoading } from "@/store/ui/useLoading"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { validateDescription } from "@/utils/productValidation"
import { RichTextToolbar } from "./RichTextToolbar"
import { MarkdownEditor } from "@/components/ui/Inputs/MarkdownEditor"
import { MarkdownText } from "@/components/ui/MarkdownText"

interface FormatDescriptionFormProps {
  id: string
  translations: ProductTranslations
}

export function FormatDescriptionForm({ id, translations }: FormatDescriptionFormProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const { replaceProduct, updateProduct } = useOwnerProductsStore()
  const currentTranslation = translations[locale] ?? translations.fi

  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentTranslation.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  const enableInput = () => {
    setValue(currentTranslation.description ?? "")  // re-sync in case translations updated since last open
    setError(null)
    setIsEditing(true)
    requestAnimationFrame(() => descriptionRef.current?.focus())
  }

  const handleSave = async () => {
    const validation = validateDescription(value)
    if (validation !== true) {
      setError(validation)
      return
    }

    const trimmed = value.trim()
    if (trimmed === (currentTranslation.description ?? "").trim()) {
      setIsEditing(false)
      return
    }

    const snapshot = translations
    // Optimistic: update current locale immediately so UI feels instant
    updateProduct(id, p => ({ ...p, translations: { ...translations, [locale]: { ...currentTranslation, description: trimmed } } }))
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.translateDescription({ productId: id, description: trimmed, translations })
      if ("error" in response) throw new Error(response.error)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, p => ({ ...p, translations: snapshot }))
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
      {isEditing ? (
        <div className="flex flex-col gap-1">
          <RichTextToolbar textareaRef={descriptionRef} onChange={v => setValue(v)} />
          <MarkdownEditor
            ref={descriptionRef}
            value={value}
            onChange={v => { setValue(v); setError(null) }}
            onBlur={handleSave}
            disabled={isLoading}
            placeholder={t("placeholder.description")}
            className={twMerge(isLoading && "animate-pulse")}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <button
          className="flex w-full min-w-0 items-start gap-2 rounded p-1 text-left transition-colors duration-150 hover:bg-warning/20"
          type="button"
          onClick={enableInput}>
          <h2 className="line-clamp-3 min-w-0 flex-1 break-words text-sm leading-6 text-subTitle">
            <MarkdownText text={currentTranslation.description ?? ""} />
          </h2>
          <CiEdit className="mt-1 shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
