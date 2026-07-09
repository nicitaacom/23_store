"use client"

import { useEffect, useRef, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { formatNumber, parseFormattedNumber } from "@/utils/numberFormatter"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { ProductInput } from "@/components/ui/Inputs/Validation"

interface FormatOnStockFormProps {
  id: string
  onStock: number
  // When the product has variants, on_stock is the accumulated stock of those variants (server-maintained),
  // so it is shown read-only here — edit the stock per variant below instead.
  isDerivedFromVariants?: boolean
}

export function FormatOnStockForm({ id, onStock, isDerivedFromVariants = false }: FormatOnStockFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const [isEditing, setIsEditing] = useState(false)
  const isEditingRef = useRef(false)
  const { replaceProduct, updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isLoading])

  async function updateOnStock(nextOnStock: number) {
    const snapshot = onStock

    updateProduct(id, p => ({ ...p, on_stock: nextOnStock }))
    isEditingRef.current = false
    setIsEditing(false)
    setIsLoading(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, onStock: nextOnStock })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      updateProduct(id, p => ({ ...p, on_stock: snapshot }))
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

  const containerRef = useRef<HTMLDivElement | null>(null)

  const enableInput = () => {
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

  // Variants own the stock — show the accumulated total read-only (edit it per variant below)
  if (isDerivedFromVariants) {
    return (
      <div className="rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("on_stock")}:</p>
          <span className="text-sm font-medium text-title">{formatNumber(onStock) || onStock}</span>
          <span className="text-[11px] text-subTitle/70">({t("variant")})</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={twMerge("rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none")}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("on_stock")}:</p>
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
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
                autoFocus
                required
              />
            </div>
          </form>
        ) : (
          <button className="flex items-center gap-1.5 rounded p-1 transition-colors duration-150 hover:bg-warning/20" type="button" onClick={enableInput}>
            <span className="text-sm font-medium text-title">{formatNumber(onStock) || onStock}</span>
            <CiEdit className="text-subTitle" />
          </button>
        )}
      </div>
    </div>
  )
}
