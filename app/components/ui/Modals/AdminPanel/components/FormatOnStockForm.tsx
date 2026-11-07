"use client"

import { useEffect, useRef, useState } from "react"
import { BiLoaderAlt } from "react-icons/bi"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { formatNumber, parseFormattedNumber } from "@/utils/numberFormatter"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { claimFieldRevision, confirmStock, isLatestFieldRevision } from "@/utils/confirmStoredFields"
import { presentStoredUpdateError } from "@/utils/presentStoredUpdateError"
import { ProductInput } from "@/components/ui/Inputs/Validation"

interface FormatOnStockFormProps {
  id: string
  onStock: number
  // When the product has variants, on_stock is the accumulated stock of those variants (server-maintained),
  // so it is shown read-only here — edit the stock per variant below instead.
  isDerivedFromVariants?: boolean
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatOnStockForm({ id, onStock, isDerivedFromVariants = false }: FormatOnStockFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const isEditingRef = useRef(false)
  const isUpdatingRef = useRef(false)
  const { updateProduct } = useOwnerProductsStore()

  useEffect(() => {
    if (!isLoading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isLoading])

  async function updateOnStock(nextOnStock: number) {
    const revision = claimFieldRevision(id, "stock")
    isUpdatingRef.current = true
    setSaveError(null)
    setIsUpdating(true)
    updateProduct(id, product => ({ ...product, on_stock: nextOnStock }))
    setIsLoading(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, onStock: nextOnStock })
      if (!isLatestFieldRevision(id, "stock", revision)) return
      if (typeof response === "string" || !response?.product) throw new Error(typeof response === "string" ? response : "Stock update returned no row")
      updateProduct(id, current => confirmStock(current, response.product))
      isEditingRef.current = false
      setIsEditing(false)
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      if (!isLatestFieldRevision(id, "stock", revision)) return
      const errorMessage = presentStoredUpdateError(error instanceof Error ? error.message : String(error), t("manage_update_kept"))
      setSaveError(errorMessage)
      updateProduct(id, product => ({ ...product, on_stock: onStock }))
      toast.show("error", t("manage_product_error"), errorMessage)
    } finally {
      if (!isLatestFieldRevision(id, "stock", revision)) return
      isUpdatingRef.current = false
      setIsUpdating(false)
      setIsLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: hasChanges },
  } = useForm<IFormDataAddProduct>()

  useAdminPanelChanged(`edit-product-${id}-stock`, (isEditing && hasChanges) || isUpdating)

  const onSubmit = (data: IFormDataAddProduct) => {
    updateOnStock(parseFormattedNumber(data.onStock))
  }

  const containerRef = useRef<HTMLDivElement | null>(null)

  const enableInput = () => {
    isEditingRef.current = true
    setSaveError(null)
    setIsEditing(true)
    requestAnimationFrame(() => containerRef.current?.querySelector("input")?.focus())
  }

  const disableInput = (event: KeyboardEvent) => {
    const pressedNode = event.composedPath()[0]
    if (!(pressedNode instanceof Node) || !containerRef.current?.contains(pressedNode)) return
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
    <div
      className={twMerge(
        "rounded border bg-background/70 px-3 py-2 shadow-none",
        saveError ? "border-danger" : isUpdating ? "cursor-progress border-brand" : "border-border-color/30",
      )}
      aria-busy={isUpdating}
      ref={containerRef}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("on_stock")}:</p>
        {isEditing ? (
          <form className="flex items-center gap-1.5" onSubmit={event => handleSubmit(onSubmit)(event)}>
            <ProductInput
              className={twMerge(
                "block h-5 border-0 bg-transparent px-0 py-0 text-sm font-medium leading-5 text-title",
                isUpdating && "cursor-progress",
              )}
              style={{ width: `${(formatNumber(onStock) || onStock.toString()).length}ch`, height: 20, padding: 0 }}
              data-cy="product-stock-input"
              id="onStock"
              type="numeric"
              numericFormat="grouped"
              register={register}
              errors={errors}
              placeholder={formatNumber(onStock) || onStock.toString()}
              required
              autoFocus
            />
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-brand">
              {isUpdating && <BiLoaderAlt className="animate-spin" size={16} aria-hidden />}
            </span>
          </form>
        ) : (
          <button className="flex items-center gap-1.5 rounded py-0 transition-colors duration-150 hover:bg-warning/20" data-cy="edit-product-stock" type="button" onClick={enableInput}>
            <span className="text-sm font-medium leading-5 text-title">{formatNumber(onStock) || onStock}</span>
            <CiEdit className="h-4 w-4 shrink-0 text-subTitle" />
          </button>
        )}
      </div>
    </div>
  )
}
