"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { ProductInput } from "@/components/ui/Inputs/Validation"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import { formatNumber, parseFormattedNumber } from "@/utils/numberFormatter"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

interface FormatOnStockFormProps {
  id: string
  onStock: number
}

export function FormatOnStockForm({ id, onStock }: FormatOnStockFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const replaceProduct = useOwnerProductsStore(state => state.replaceProduct)

  async function updateOnStock(onStock: number) {
    setIsLoading(true)
    try {
      const response = await productsSDK.updateProduct({
        productId: id,
        onStock,
      })
      replaceProduct(id, response.product)
      setIsEditing(false)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
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
    updateOnStock(parseFormattedNumber(data.onStock))
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
    <div className={twMerge("rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none tablet:max-w-[220px]")}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("on_stock")}</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                "w-full border-border-color/50 bg-background/60 text-start",
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
        <button className="flex items-center gap-2" type="button" onClick={enableInput}>
          <span className="text-sm font-medium text-title">{formatNumber(onStock) || onStock}</span>
          <CiEdit className="text-subTitle" />
        </button>
      )}
    </div>
  )
}
