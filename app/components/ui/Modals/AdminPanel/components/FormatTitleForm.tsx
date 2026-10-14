"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"
import { useForm } from "react-hook-form"

import { TProductTranslations } from "@/ts/product/TProductDB"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import useToast from "@/store/ui/useToast"
import { ProductInput } from "@/components/ui/Inputs/Validation"

interface FormatTitleFormProps {
  id: string
  translations: TProductTranslations
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatTitleForm({ id, translations }: FormatTitleFormProps) {
  const t = useScopedI18n("product")
  const tCommon = useScopedI18n("common")
  const locale = useCurrentLocale()
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const isEditingRef = useRef(false)
  const isTranslatingRef = useRef(false)
  const currentTranslation = translations[locale] ?? translations.fi
  const { replaceProduct, updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isTranslating) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isTranslating])

  async function updateTitle(title: string) {
    if (isTranslatingRef.current) return
    isTranslatingRef.current = true

    updateProduct(id, product => ({
      ...product,
      translations: { ...translations, [locale]: { ...currentTranslation, title } },
    }))
    isEditingRef.current = false
    setIsEditing(false)
    setIsTranslating(true)

    try {
      const response = await productsSDK.translateField({ productId: id, field: "title", value: title, translations })
      if ("error" in response) throw new Error(response.error)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, product => {
        const currentLocaleTranslation = product.translations[locale] ?? product.translations.fi
        if (currentLocaleTranslation.title !== title) return product

        return {
          ...product,
          translations: {
            ...product.translations,
            [locale]: { ...currentLocaleTranslation, title: currentTranslation.title },
          },
        }
      })
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error), 10000)
    } finally {
      isTranslatingRef.current = false
      setIsTranslating(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty: hasChanges },
  } = useForm<IFormDataAddProduct>()

  useAdminPanelChanged(`edit-product-${id}-title`, (isEditing && hasChanges) || isTranslating)

  const onSubmit = (data: IFormDataAddProduct) => {
    updateTitle(data.title)
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enableInput = () => {
    reset({ title: currentTranslation.title })
    isEditingRef.current = true
    setIsEditing(true)
    requestAnimationFrame(() => containerRef.current?.querySelector("input")?.focus())
  }

  const cancelInput = () => {
    isEditingRef.current = false
    setIsEditing(false)
  }

  const handleInputBlur = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => {
      // If focus stayed inside the container (e.g. error message clicked), keep editing
      if (containerRef.current?.contains(document.activeElement)) return
      cancelInput()
    }, 150)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (!isEditingRef.current) return
    if (event.key === "Escape") {
      event.stopImmediatePropagation()
      cancelInput()
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", disableInput, true)
    return () => document.removeEventListener("keydown", disableInput, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-w-0 flex-1" data-cy="product-title-form" ref={containerRef}>
      {isEditing ? (
        <form onSubmit={event => handleSubmit(onSubmit)(event)}>
          <ProductInput
            className={twMerge("w-full border-border-color/50 bg-background/60 text-start", isTranslating && "animate-pulse")}
            data-cy="product-title-input"
            id="title"
            register={register}
            errors={errors}
            placeholder={currentTranslation.title}
            required
            onBlur={handleInputBlur}
            autoFocus
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              className="rounded px-2 py-0.5 text-xs text-white/70 transition-colors hover:text-white/80"
              type="button"
              onClick={cancelInput}>
              {tCommon("cancel")}
            </button>
            <button
              className="rounded bg-brand/20 px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand/30 disabled:opacity-50"
              data-cy="save-product-title"
              type="submit"
              disabled={isTranslating}>
              {tCommon("save")}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex w-full min-w-0 items-center gap-2 rounded px-1 py-1 text-left transition-colors duration-150 hover:bg-warning/20"
          data-cy="edit-product-title"
          disabled={isTranslating}
          type="button"
          onClick={enableInput}>
          <span className="truncate text-base font-semibold text-title">{currentTranslation.title}</span>
          <CiEdit className="shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
