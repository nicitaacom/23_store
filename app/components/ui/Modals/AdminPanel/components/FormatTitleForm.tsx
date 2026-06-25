"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"
import { useForm } from "react-hook-form"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useLoading } from "@/store/ui/useLoading"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

interface FormatTitleFormProps {
  id: string
  translations: ProductTranslations
}

export function FormatTitleForm({ id, translations }: FormatTitleFormProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const isEditingRef = useRef(false)
  const { isLoading, setIsLoading } = useLoading()
  const currentTranslation = translations[locale] ?? translations.fi
  const { replaceProduct, updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isLoading])

  async function updateTitle(title: string) {
    const snapshot = translations
    updateProduct(id, p => ({ ...p, translations: { ...translations, [locale]: { ...currentTranslation, title } } }))
    isEditingRef.current = false
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.translateField({ productId: id, field: "title", value: title, translations })
      if ("error" in response) throw new Error(response.error)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, p => ({ ...p, translations: snapshot }))
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error), 10000)
    } finally {
      setIsLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = (data: IFormDataAddProduct) => {
    updateTitle(data.title)
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enableInput = () => {
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
    <div ref={containerRef} className="min-w-0 flex-1">
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProductInput
            className={twMerge(
              "w-full border-border-color/50 bg-background/60 text-start",
              isLoading && "animate-pulse",
            )}
            id="title"
            register={register}
            errors={errors}
            placeholder={currentTranslation.title}
            autoFocus
            required
            onBlur={handleInputBlur}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button type="button" onClick={cancelInput}
              className="rounded px-2 py-0.5 text-xs text-white/50 transition-colors hover:text-white/80">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="rounded bg-brand/20 px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand/30 disabled:opacity-50">
              Save
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex w-full min-w-0 items-center gap-2 rounded px-1 py-1 text-left transition-colors duration-150 hover:bg-warning/20"
          type="button"
          onClick={enableInput}>
          <span className="truncate text-base font-semibold text-title">{currentTranslation.title}</span>
          <CiEdit className="shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
