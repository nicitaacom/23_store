"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import axios from "axios"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { TUpdateProductRequest } from "@/api/products/update/route"
import { useLoading } from "@/store/ui/useLoading"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { useScopedI18n } from "@/locales/client"

interface FormatDescriptionFormProps {
  id: string
  subTitle: string
}

export function FormatDescriptionForm({ id, subTitle }: FormatDescriptionFormProps) {
  const t = useScopedI18n("product")
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(subTitle: string) {
    setIsLoading(true)
    await axios.post("/api/products/update", { productId: id, subTitle: subTitle } as TUpdateProductRequest)
    setIsEditing(false)
    setIsLoading(false)
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = (data: IFormDataAddProduct) => {
    updateTitle(data.subTitle)
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
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
      {isEditing ? (
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                `min-h-[92px] w-full rounded-xl border border-border-color/70 bg-background/50 px-3 py-2 text-sm text-start`,
                isLoading && "animate-pulse",
              )}
              id="subTitle"
              register={register}
              errors={errors}
              placeholder={subTitle}
              required
            />
          </div>
        </form>
      ) : (
        <button className="flex items-start gap-x-2 text-left" type="button" onClick={enableInput}>
          <h2 className="line-clamp-3 text-sm leading-6 text-subTitle">{subTitle}</h2>
          <CiEdit className="mt-1 shrink-0 text-subTitle" />
        </button>
      )}
    </div>
  )
}
