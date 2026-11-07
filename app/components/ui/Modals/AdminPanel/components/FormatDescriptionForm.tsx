"use client"

import { useEffect, useRef, useState } from "react"
import { BiLoaderAlt } from "react-icons/bi"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"

import { TProductTranslations } from "@/ts/product/TProductDB"
import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { RichTextToolbar } from "./RichTextToolbar"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import useToast from "@/store/ui/useToast"
import { claimFieldRevision, confirmDescription, isLatestFieldRevision } from "@/utils/confirmStoredFields"
import { presentStoredUpdateError } from "@/utils/presentStoredUpdateError"
import { validateDescription } from "@/utils/productValidation"
import { MarkdownEditor } from "@/components/ui/Inputs/MarkdownEditor"
import { MarkdownText } from "@/components/ui/MarkdownText"

interface FormatDescriptionFormProps {
  id: string
  translations: TProductTranslations
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatDescriptionForm({ id, translations }: FormatDescriptionFormProps) {
  const t = useScopedI18n("product")
  const tCommon = useScopedI18n("common")
  const locale = useCurrentLocale()
  const toast = useToast()
  const { updateProduct } = useOwnerProductsStore()
  const storedTranslations = useOwnerProductsStore(state => state.products.find(item => item.id === id)?.translations)
  const visibleTranslations = storedTranslations ?? translations
  const currentTranslation = visibleTranslations[locale] ?? visibleTranslations.fi

  const [isEditing, setIsEditing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const isTranslatingRef = useRef(false)
  const [value, setValue] = useState(currentTranslation.description ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const wrapRef = useRef<((marker: string) => void) | null>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const valueRef = useRef(value)
  const hasChanges = isEditing && value.trim() !== (currentTranslation.description ?? "").trim()
  useAdminPanelChanged(`edit-product-${id}-description`, hasChanges || isTranslating)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const enableInput = () => {
    setValue(currentTranslation.description ?? "")
    setError(null)
    setSaveError(null)
    setIsEditing(true)
    requestAnimationFrame(() => descriptionRef.current?.focus())
  }

  const handleCancel = () => {
    if (isTranslatingRef.current) return
    setValue(currentTranslation.description ?? "")
    setError(null)
    setSaveError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (isTranslatingRef.current) return

    const current = valueRef.current
    const validation = validateDescription(current)
    if (validation !== true) {
      setError(validation)
      return
    }

    const trimmed = current.trim()
    if (trimmed === (currentTranslation.description ?? "").trim()) {
      setIsEditing(false)
      return
    }

    const revision = claimFieldRevision(id, "description")
    isTranslatingRef.current = true
    setSaveError(null)
    setIsTranslating(true)
    updateProduct(id, current => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...(current.translations[locale] ?? current.translations.fi), description: trimmed },
      },
    }))

    try {
      const response = await productsSDK.translateField({ productId: id, field: "description", value: trimmed, locale, translations: visibleTranslations })
      if (!isLatestFieldRevision(id, "description", revision)) return
      if (!response || typeof response !== "object" || !("product" in response) || !response.product) {
        const errorText = response && typeof response === "object" && "error" in response ? String(response.error) : "Description update returned no row"
        throw new Error(errorText)
      }
      updateProduct(id, current => {
        const confirmed = confirmDescription(current, response.product)
        const localeTranslation = confirmed.translations[locale] ?? confirmed.translations.fi
        return {
          ...confirmed,
          translations: {
            ...confirmed.translations,
            [locale]: { ...localeTranslation, description: trimmed },
          },
        }
      })
      setIsEditing(false)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      if (!isLatestFieldRevision(id, "description", revision)) return
      const errorMessage = presentStoredUpdateError(error instanceof Error ? error.message : String(error), t("manage_update_kept"))
      setSaveError(errorMessage)
      updateProduct(id, product => {
        const currentLocaleTranslation = product.translations[locale] ?? product.translations.fi
        if (currentLocaleTranslation.description !== trimmed) return product

        return {
          ...product,
          translations: {
            ...product.translations,
            [locale]: { ...currentLocaleTranslation, description: currentTranslation.description ?? "" },
          },
        }
      })
      toast.show("error", t("manage_product_error"), errorMessage, 10000)
    } finally {
      if (!isLatestFieldRevision(id, "description", revision)) return
      isTranslatingRef.current = false
      setIsTranslating(false)
    }
  }

  return (
    <div
      className={twMerge(
        "rounded border bg-background/70 p-3 shadow-none",
        saveError ? "border-danger" : isTranslating ? "cursor-progress border-brand" : "border-border-color/30",
      )}
      data-cy="product-description-form"
      aria-busy={isTranslating}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
      {isEditing ? (
        <div className="flex flex-col gap-1" ref={editorContainerRef}>
          <div className="flex items-center justify-between">
            <RichTextToolbar onWrap={marker => {
              if (isTranslatingRef.current) return
              wrapRef.current?.(marker)
            }} />
            <div className="flex gap-1">
              <button
                className={twMerge(
                  "rounded px-2 py-0.5 text-xs text-white/70 transition-colors hover:text-white/80",
                  isTranslating && "cursor-progress",
                )}
                type="button"
                onClick={handleCancel}>
                {tCommon("cancel")}
              </button>
              <button
                className={twMerge(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-brand",
                  isTranslating ? "cursor-progress bg-brand/20" : "bg-brand/20 hover:bg-brand/30",
                )}
                data-cy="save-product-description"
                type="button"
                onClick={handleSave}>
                {isTranslating && <BiLoaderAlt className="animate-spin" size={12} aria-hidden />}
                {tCommon("save")}
              </button>
            </div>
          </div>
          <MarkdownEditor
            className={twMerge(
              isTranslating && "border-brand bg-background/60 cursor-progress",
              saveError && "border-danger bg-background/60",
            )}
            ref={descriptionRef}
            onWrapRef={wrapRef}
            value={value}
            id="product-description-input"
            onSaveChord={() => {
              void handleSave()
            }}
            onChange={nextValue => {
              setValue(nextValue)
              setError(null)
              if (isTranslatingRef.current || nextValue === valueRef.current) return
              setSaveError(null)
            }}
            disabled={isTranslating}
            placeholder={t("placeholder.description")}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          {saveError && <p className="text-xs text-danger" role="alert">{saveError}</p>}
        </div>
      ) : (
        <button
          className="flex w-full min-w-0 items-start gap-2 rounded p-1 text-left transition-colors duration-150 hover:bg-warning/20"
          data-cy="edit-product-description"
          disabled={isTranslating}
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
