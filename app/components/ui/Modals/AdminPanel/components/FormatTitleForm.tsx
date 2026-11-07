"use client"

import { useEffect, useRef, useState } from "react"
import { BiLoaderAlt } from "react-icons/bi"
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
import { claimFieldRevision, confirmTitle, isLatestFieldRevision } from "@/utils/confirmStoredFields"
import { presentStoredUpdateError } from "@/utils/presentStoredUpdateError"
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
  const [saveError, setSaveError] = useState<string | null>(null)
  const isEditingRef = useRef(false)
  const isTranslatingRef = useRef(false)
  const { updateProduct } = useOwnerProductsStore()
  const storedTranslations = useOwnerProductsStore(state => state.products.find(item => item.id === id)?.translations)
  const visibleTranslations = storedTranslations ?? translations
  const currentTranslation = visibleTranslations[locale] ?? visibleTranslations.fi

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
    const revision = claimFieldRevision(id, "title")
    const previousTitle = currentTranslation.title
    isTranslatingRef.current = true
    setSaveError(null)
    setIsTranslating(true)

    updateProduct(id, current => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...(current.translations[locale] ?? current.translations.fi), title },
      },
    }))

    try {
      const response = await productsSDK.translateField({
        productId: id,
        field: "title",
        value: title,
        locale,
        translations: visibleTranslations,
      })
      if (!isLatestFieldRevision(id, "title", revision)) return
      if (!response || typeof response !== "object" || !("product" in response) || !response.product) {
        const errorText = response && typeof response === "object" && "error" in response ? String(response.error) : "Title update returned no row"
        throw new Error(errorText)
      }
      updateProduct(id, current => {
        const confirmed = confirmTitle(current, response.product)
        const localeTranslation = confirmed.translations[locale] ?? confirmed.translations.fi
        return {
          ...confirmed,
          translations: {
            ...confirmed.translations,
            [locale]: { ...localeTranslation, title },
          },
        }
      })
      isEditingRef.current = false
      setIsEditing(false)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      if (!isLatestFieldRevision(id, "title", revision)) return
      const errorMessage = presentStoredUpdateError(error instanceof Error ? error.message : String(error), t("manage_update_kept"))
      setSaveError(errorMessage)
      updateProduct(id, product => {
        const currentLocaleTranslation = product.translations[locale] ?? product.translations.fi
        if (currentLocaleTranslation.title !== title) return product

        return {
          ...product,
          translations: {
            ...product.translations,
            [locale]: { ...currentLocaleTranslation, title: previousTitle },
          },
        }
      })
      toast.show("error", t("manage_product_error"), errorMessage, 10000)
    } finally {
      if (!isLatestFieldRevision(id, "title", revision)) return
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
  // Set only by a real click or Tab outside this field. A finished price save moves
  // focus on its own, and that must not close an edit the owner already opened.
  const dismissOnBlurRef = useRef(false)

  const enableInput = () => {
    reset({ title: currentTranslation.title })
    isEditingRef.current = true
    dismissOnBlurRef.current = false
    setSaveError(null)
    setIsEditing(true)
    requestAnimationFrame(() => containerRef.current?.querySelector("input")?.focus())
  }

  const cancelInput = () => {
    if (isTranslatingRef.current) return
    isEditingRef.current = false
    dismissOnBlurRef.current = false
    setIsEditing(false)
  }

  const handleInputBlur = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    blurTimerRef.current = setTimeout(() => {
      if (isTranslatingRef.current) return
      // If focus stayed inside the container (e.g. error message clicked), keep editing
      if (containerRef.current?.contains(document.activeElement)) return
      if (!dismissOnBlurRef.current) return
      cancelInput()
    }, 150)
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!isEditingRef.current) return
      const clickedNode = event.composedPath()[0]
      dismissOnBlurRef.current = !(clickedNode instanceof Node && containerRef.current?.contains(clickedNode))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEditingRef.current || isTranslatingRef.current) return
      if (event.key === "Tab") dismissOnBlurRef.current = true
      if (event.key !== "Escape") return
      event.stopImmediatePropagation()
      cancelInput()
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [])

  return (
    <div
      className={twMerge(
        "min-w-0 flex-1 rounded",
        saveError && "ring-1 ring-danger",
        isTranslating && "cursor-progress ring-1 ring-brand",
      )}
      data-cy="product-title-form"
      aria-busy={isTranslating}
      ref={containerRef}>
      {isEditing ? (
        <form onSubmit={event => handleSubmit(onSubmit)(event)}>
          <ProductInput
            className={twMerge(
              "w-full border-border-color/50 bg-background/60 text-start",
              isTranslating && "border-brand opacity-100 cursor-progress",
              saveError && "border-danger opacity-100",
            )}
            data-cy="product-title-input"
            id="title"
            register={register}
            errors={errors}
            placeholder={currentTranslation.title}
            required
            readOnly={isTranslating}
            onBlur={handleInputBlur}
            autoFocus
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              className={twMerge(
                "rounded px-2 py-0.5 text-xs text-white/70 transition-colors hover:text-white/80",
                isTranslating && "cursor-progress",
              )}
              type="button"
              onClick={cancelInput}>
              {tCommon("cancel")}
            </button>
            <button
              className={twMerge(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-brand",
                isTranslating ? "cursor-progress bg-brand/20" : "bg-brand/20 hover:bg-brand/30",
              )}
              data-cy="save-product-title"
              type="submit">
              {isTranslating && <BiLoaderAlt className="animate-spin" size={12} aria-hidden />}
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
