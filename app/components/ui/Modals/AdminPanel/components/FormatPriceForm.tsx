"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import axios from "axios"

import { TUpdateProductRequest } from "@/api/products/update/route"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"

interface FormatPriceFormProps {
  id: string
  price: number
}

export function FormatPriceForm({ id, price }: FormatPriceFormProps) {
  const t = useScopedI18n("product")
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(price: number) {
    setIsLoading(true)
    await axios.post("/api/products/update", { productId: id, price: price } as TUpdateProductRequest)
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
    updateTitle(data.price)
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
      handleSubmit(onSubmit) // call on submit like this to prevent x3 re-render
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
  }, [])

  return (
    <div className="tablet:min-w-[150px]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle tablet:text-right">{t("price")}</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                `w-full rounded-xl border border-border-color/70 bg-background/50 px-3 py-2 text-sm text-start tablet:text-end`,
                isLoading && "animate-pulse",
              )}
              id="price"
              register={register}
              errors={errors}
              placeholder={price.toString()}
              required
            />
          </div>
        </form>
      ) : (
        <button className="flex items-center gap-x-2 tablet:ml-auto" type="button" onClick={enableInput}>
          <span className="text-sm font-semibold text-title">{formatCurrency(price)}</span>
          <CiEdit className="text-subTitle" />
        </button>
      )}
    </div>
  )
}
