"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"
import { useForm } from "react-hook-form"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { TUpdateProductRequest } from "@/api/products/update/route"
import { useLoading } from "@/store/ui/useLoading"
import { ProductTranslations } from "@/ts/product/TProductDB"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

interface FormatTitleFormProps {
  id: string
  translations: ProductTranslations
}

export function FormatTitleForm({ id, translations }: FormatTitleFormProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)
  const currentTranslation = translations[locale] ?? translations.fi

  async function updateTitle(title: string) {
    setIsLoading(true)
    const response = await fetch("/api/products/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: id,
        translations: {
          ...translations,
          [locale]: {
            ...currentTranslation,
            title,
          },
        },
      } as TUpdateProductRequest),
    })

    if (!response.ok) {
      setIsLoading(false)
      throw new Error(await getResponseErrorMessage(response))
    }

    router.refresh()
    setIsEditing(false)
    setIsLoading(false)
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
                `w-full rounded-xl border border-border-color/70 bg-background/50 px-3 py-2 text-sm text-start`,
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
          className="flex min-w-0 items-center gap-x-2 rounded-xl border border-transparent px-0 py-1 text-left transition-colors duration-200 hover:text-title"
          type="button"
          onClick={enableInput}>
          <span className="truncate text-base font-semibold text-title">{currentTranslation.title}</span>
          <CiEdit className="shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
