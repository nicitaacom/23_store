"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import { formatNumber, parseFormattedNumber } from "@/utils/numberFormatter"

interface FormatOnStockFormProps {
  id: string
  onStock: number
}

export function FormatOnStockForm({ id, onStock }: FormatOnStockFormProps) {
  const t = useScopedI18n("product")
  const router = useRouter()
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  async function updateTitle(onStock: number) {
    setIsLoading(true)
    await supabaseClient.from("products").update({ on_stock: onStock }).eq("id", id)
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
    updateTitle(parseFormattedNumber(data.onStock))
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
    <div className="tablet:max-w-[220px]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("on_stock")}</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                `w-full rounded-xl border border-border-color/70 bg-background/50 px-3 py-2 text-sm text-start`,
                isLoading && "animate-pulse",
              )}
              id="onStock"
              type="numeric"
              numericFormat="grouped"
              register={register}
              errors={errors}
              placeholder={formatNumber(onStock) || onStock.toString()}
              required
            />
          </div>
        </form>
      ) : (
        <button className="flex items-center gap-x-2" type="button" onClick={enableInput}>
          <span className="text-sm font-medium text-title">{formatNumber(onStock) || onStock}</span>
          <CiEdit className="text-subTitle" />
        </button>
      )}
    </div>
  )
}
