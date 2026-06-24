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
import { RichTextToolbar } from "./RichTextToolbar"

interface FormatDescriptionFormProps {
  id: string
  translations: ProductTranslations
}

export function FormatDescriptionForm({ id, translations }: FormatDescriptionFormProps) {
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

  async function updateDescription(description: string) {
    const snapshot = translations
    const nextTranslations = { ...translations, [locale]: { ...currentTranslation, description } }

    updateProduct(id, p => ({ ...p, translations: nextTranslations }))
    isEditingRef.current = false
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
    setValue,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  const onSubmit = (data: IFormDataAddProduct) => {
    updateDescription(data.subTitle)
  }

  const containerRef = useRef<HTMLDivElement | null>(null)

  const enableInput = () => {
    isEditingRef.current = true
    setIsEditing(true)
    requestAnimationFrame(() => containerRef.current?.querySelector("textarea")?.focus())
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.key === "Escape") console.log("[FormatDescription] keydown Escape, isEditingRef=", isEditingRef.current)
    if (!isEditingRef.current) return
    if (event.shiftKey && event.key === "Enter") return
    if (event.key === "Escape") {
      event.stopImmediatePropagation()
      isEditingRef.current = false
      setIsEditing(false)
    }
    if (event.key === "Enter") {
      const onSubmitForm = handleSubmit(onSubmit)
      onSubmitForm()
    }
  }

  useEffect(() => {
    console.log("[FormatDescription] mount - registering listener")
    document.addEventListener("keydown", disableInput, true)
    return () => {
      console.log("[FormatDescription] unmount - removing listener")
      document.removeEventListener("keydown", disableInput, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={containerRef} className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
      {isEditing ? (
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <RichTextToolbar textareaRef={descriptionRef} onChange={v => setValue("subTitle", v, { shouldValidate: true })} />
          <ProductInput
            className={twMerge(
              "min-h-[92px] w-full border-border-color/50 bg-background/60 text-start",
              isLoading && "animate-pulse",
            )}
            id="subTitle"
            register={register}
            errors={errors}
            placeholder={currentTranslation.description}
            externalTextareaRef={descriptionRef}
            autoFocus
          />
        </form>
      ) : (
        <button className="flex w-full min-w-0 items-start gap-2 rounded p-1 text-left transition-colors duration-150 hover:bg-warning/20" type="button" onClick={enableInput}>
          <h2 className="line-clamp-3 min-w-0 flex-1 break-words text-sm leading-6 text-subTitle">{currentTranslation.description}</h2>
          <CiEdit className="mt-1 shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
