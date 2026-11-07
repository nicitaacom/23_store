"use client"

import { useEffect, useRef, useState } from "react"
import { BiLoaderAlt } from "react-icons/bi"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"

import { useAdminPanelChanged } from "../AdminPanelChangedContext"
import { CategoryDropdown } from "./CategoryDropdown"
import { categoriesSDK } from "@/sdk/CategoriesSDK/CategoriesSDK"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useCategories } from "@/store/categories/useCategories"
import { useI18n } from "@/locales/client"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import useToast from "@/store/ui/useToast"
import { claimFieldRevision, confirmCategory, isLatestFieldRevision } from "@/utils/confirmStoredFields"
import { presentStoredUpdateError } from "@/utils/presentStoredUpdateError"

interface FormatCategoryFormProps {
  id: string
  category_id: string | null | undefined
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatCategoryForm({ id, category_id }: FormatCategoryFormProps) {
  const t = useI18n()
  const toast = useToast()
  const { categories, hydrate } = useCategories()
  const { updateProduct } = useOwnerProductsStore()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(category_id ?? null)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const isUpdatingCategoryRef = useRef(false)

  useEffect(() => {
    if (categories.length > 0) return
    categoriesSDK.selectDBCategories().then(result => {
      if ("categories" in result) hydrate(result.categories)
    })
  }, [categories.length, hydrate])

  const currentName = categories.find(category => category.id === category_id)?.name ?? t("category.uncategorized")
  useAdminPanelChanged(
    `edit-product-${id}-category`,
    (isEditing && selectedId !== (category_id ?? null)) || isUpdatingCategory,
  )

  const handleSave = async () => {
    if (isUpdatingCategoryRef.current) return
    const revision = claimFieldRevision(id, "category")
    const snapshot = category_id ?? null
    isUpdatingCategoryRef.current = true
    setSaveError(null)
    setIsUpdatingCategory(true)
    updateProduct(id, product => ({ ...product, category_id: selectedId }))

    try {
      const response = await productsSDK.updateProduct({ productId: id, category_id: selectedId })
      if (!isLatestFieldRevision(id, "category", revision)) return
      if (typeof response === "string" || !response?.product) throw new Error(typeof response === "string" ? response : "Category update returned no row")
      updateProduct(id, current => confirmCategory(current, response.product))
      setIsEditing(false)
    } catch (error) {
      if (!isLatestFieldRevision(id, "category", revision)) return
      const errorMessage = presentStoredUpdateError(error instanceof Error ? error.message : String(error), t("product.manage_update_kept"))
      setSaveError(errorMessage)
      if (isLatestFieldRevision(id, "category", revision)) updateProduct(id, product => ({ ...product, category_id: snapshot }))
      toast.show("error", t("category.edit_category"), errorMessage)
    } finally {
      if (!isLatestFieldRevision(id, "category", revision)) return
      isUpdatingCategoryRef.current = false
      setIsUpdatingCategory(false)
    }
  }

  return (
    <div
      className={twMerge(
        "rounded border bg-background/70 px-3 py-2 shadow-none",
        saveError ? "border-danger" : isUpdatingCategory ? "cursor-progress border-brand" : "border-border-color/30",
      )}
      aria-busy={isUpdatingCategory}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("category.edit_category")}:</p>
        {isEditing ? (
          <div className="flex flex-1 flex-col gap-2">
            <CategoryDropdown
              categories={categories}
              value={selectedId}
              onChange={nextId => {
                if (isUpdatingCategoryRef.current) return
                setSelectedId(nextId)
                setSaveError(null)
              }}
              busy={isUpdatingCategory}
              uncategorizedLabel={t("category.uncategorized")}
            />
            <div className="flex gap-2">
              <button
                className={twMerge(
                  "inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors duration-150",
                  isUpdatingCategory
                    ? "cursor-progress border-brand bg-brand/10 text-brand"
                    : "border-success/40 bg-success/10 text-success hover:bg-success/20",
                )}
                type="button"
                onClick={handleSave}>
                {isUpdatingCategory && <BiLoaderAlt className="animate-spin" size={12} aria-hidden />}
                {t("common.save")}
              </button>
              <button
                className={twMerge(
                  "rounded border border-border-color/30 px-2 py-1 text-xs text-subTitle transition-colors duration-150 hover:bg-foreground/10",
                  isUpdatingCategory && "cursor-progress",
                )}
                type="button"
                onClick={() => {
                  if (isUpdatingCategoryRef.current) return
                  setSaveError(null)
                  setIsEditing(false)
                  setSelectedId(category_id ?? null)
                }}>
                {t("common.cancel")}
              </button>
            </div>
            {saveError && <p className="text-xs text-danger" role="alert">{saveError}</p>}
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 rounded p-1 transition-colors duration-150 hover:bg-warning/20"
            type="button"
            onClick={() => {
              setSaveError(null)
              setIsEditing(true)
            }}>
            <span className="text-sm font-medium text-title">{currentName}</span>
            <CiEdit className="text-subTitle" />
          </button>
        )}
      </div>
    </div>
  )
}
