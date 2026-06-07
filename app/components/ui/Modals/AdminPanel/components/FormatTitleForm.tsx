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
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)
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
    const nextTranslations = { ...translations, [locale]: { ...currentTranslation, title } }

    updateProduct(id, p => ({ ...p, translations: nextTranslations }))
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, translations: nextTranslations })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, p => ({ ...p, translations: snapshot }))
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error))
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

  const enableInput = () => {
    setIsEditing(true)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      setIsEditing(false)
    }
    if (event.key === "Enter") {
      const onSubmitForm = handleSubmit(onSubmit)
      onSubmitForm() // Call the onSubmit function directly
    }
  }

  useEffect(() => {
    const ref = inputRef.current
    // https://github.com/react-hook-form/react-hook-form/issues/11135
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("title")}</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                "w-full border-border-color/50 bg-background/60 text-start",
                isLoading && "animate-pulse",
              )}
              id="title"
              register={register}
              errors={errors}
              placeholder={currentTranslation.title}
              required
            />
          </div>
        </form>
      ) : (
        <button
          className="flex min-w-0 items-center gap-2 rounded px-1 py-1 text-left transition-colors duration-150 hover:bg-background/35"
          type="button"
          onClick={enableInput}>
          <span className="truncate text-base font-semibold text-title">{currentTranslation.title}</span>
          <CiEdit className="shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
