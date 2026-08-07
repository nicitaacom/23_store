"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { formatCurrency } from "@/utils/currencyFormatter"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { ProductInput } from "@/components/ui/Inputs/Validation"

interface FormatPriceFormProps {
  id: string
  price: number
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatPriceForm({ id, price }: FormatPriceFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const isEditingRef = useRef(false)
  const { isLoading, setIsLoading } = useLoading()
  const { replaceProduct, updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isLoading])

  async function updatePrice(nextPrice: number) {
    updateProduct(id, product => ({ ...product, price: nextPrice }))
    isEditingRef.current = false
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, price: nextPrice })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, product => ({ ...product, price }))
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<IFormDataAddProduct>()

  useAdminPanelChanged(`edit-product-${id}-price`, (isEditing && isDirty) || isLoading)

  const onSubmit = (data: IFormDataAddProduct) => {
    updatePrice(Number(data.price))
  }

  const containerRef = useRef<HTMLDivElement | null>(null)

  const enableInput = () => {
    reset({ price })
    isEditingRef.current = true
    setIsEditing(true)
    requestAnimationFrame(() => containerRef.current?.querySelector("input")?.focus())
  }

  const disableInput = (event: KeyboardEvent) => {
    if (!isEditingRef.current) return
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
    document.addEventListener("keydown", disableInput, true)
    return () => document.removeEventListener("keydown", disableInput, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="shrink-0 rounded border border-border-color/30 bg-background/70 px-2 py-1 shadow-none" ref={containerRef}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("price")}:</p>
        {isEditing ? (
          <form onSubmit={event => handleSubmit(onSubmit)(event)}>
            <div>
              <ProductInput
                className={twMerge(
                  "w-full border-border-color/50 bg-background/60 text-start",
                  isLoading && "animate-pulse",
                )}
                data-cy="product-price-input"
                id="price"
                register={register}
                errors={errors}
                placeholder={price.toString()}
                required
                autoFocus
              />
            </div>
          </form>
        ) : (
          <button className="flex items-center gap-1.5 rounded p-1 transition-colors duration-150 hover:bg-warning/20" data-cy="edit-product-price" type="button" onClick={enableInput}>
            <span className="text-sm font-semibold text-title" data-cy="product-price">{formatCurrency(price)}</span>
            <CiEdit className="text-subTitle" />
          </button>
        )}
      </div>
    </div>
  )
}
