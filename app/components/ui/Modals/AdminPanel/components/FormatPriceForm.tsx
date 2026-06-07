"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

interface FormatPriceFormProps {
  id: string
  price: number
}

export function FormatPriceForm({ id, price }: FormatPriceFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)
  const { replaceProduct, updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isLoading])

  async function updatePrice(nextPrice: number) {
    const snapshot = price

    updateProduct(id, p => ({ ...p, price: nextPrice }))
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, price: nextPrice })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, p => ({ ...p, price: snapshot }))
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
    updatePrice(data.price)
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
      onSubmitForm()
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
    <div className={twMerge("rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none tablet:min-w-[148px]")}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle tablet:text-right">{t("price")}</p>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(
                "w-full border-border-color/50 bg-background/60 text-start tablet:text-end",
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
        <button className="flex items-center gap-2 tablet:ml-auto" type="button" onClick={enableInput}>
          <span className="text-sm font-semibold text-title">{formatCurrency(price)}</span>
          <CiEdit className="text-subTitle" />
        </button>
      )}
    </div>
  )
}
