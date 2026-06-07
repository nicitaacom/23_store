"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useLoading } from "@/store/ui/useLoading"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

interface FormatDescriptionFormProps {
  id: string
  translations: ProductTranslations
}

export function FormatDescriptionForm({ id, translations }: FormatDescriptionFormProps) {
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

  async function updateDescription(description: string) {
    const snapshot = translations
    const nextTranslations = { ...translations, [locale]: { ...currentTranslation, description } }

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
    updateDescription(data.subTitle)
  }

  const enableInput = () => {
    setIsEditing(true)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.shiftKey && event.key === "Enter") {
      return
    }
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
    <div className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
      {isEditing ? (
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                "min-h-[92px] w-full border-border-color/50 bg-background/60 text-start",
                isLoading && "animate-pulse",
              )}
              id="subTitle"
              register={register}
              errors={errors}
              placeholder={currentTranslation.description}
            />
          </div>
        </form>
      ) : (
        <button className="flex items-start gap-2 text-left" type="button" onClick={enableInput}>
          <h2 className="line-clamp-3 text-sm leading-6 text-subTitle">{currentTranslation.description}</h2>
          <CiEdit className="mt-1 shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
