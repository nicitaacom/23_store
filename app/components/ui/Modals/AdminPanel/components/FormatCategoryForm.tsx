"use client"

import { useEffect, useState } from "react"
import { CiEdit } from "react-icons/ci"
import { twMerge } from "tailwind-merge"

import { CategoryDropdown } from "./CategoryDropdown"
import { categoriesSDK } from "@/sdk/CategoriesSDK/CategoriesSDK"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useCategoriesStore } from "@/store/categories/useCategoriesStore"
import { useI18n } from "@/locales/client"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import useToast from "@/store/ui/useToast"

interface FormatCategoryFormProps {
  id: string
  category_id: string | null | undefined
}

export function FormatCategoryForm({ id, category_id }: FormatCategoryFormProps) {
  const t = useI18n()
  const toast = useToast()
  const { categories, hydrate } = useCategoriesStore()
  const { replaceProduct, updateProduct } = useOwnerProductsStore()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(category_id ?? null)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)

  useEffect(() => {
    if (categories.length > 0) return
    categoriesSDK.selectDBCategories().then(result => {
      if ("categories" in result) hydrate(result.categories)
    })
  }, [categories.length, hydrate])

  const currentName =
    categories.find(category => category.id === category_id)?.name ?? t("category.uncategorized")

  const handleSave = async () => {
    const snapshot = category_id ?? null
    updateProduct(id, product => ({ ...product, category_id: selectedId }))
    setIsEditing(false)
    setIsUpdatingCategory(true)

    try {
      const response = await productsSDK.updateProduct({ productId: id, category_id: selectedId })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
    } catch (error) {
      updateProduct(id, product => ({ ...product, category_id: snapshot }))
      toast.show("error", t("category.edit_category"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  return (
    <div className="rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("category.edit_category")}:</p>
        {isEditing ? (
          <div className="flex flex-1 flex-col gap-2">
            <CategoryDropdown
              categories={categories}
              value={selectedId}
              onChange={setSelectedId}
              uncategorizedLabel={t("category.uncategorized")}
            />
            <div className="flex gap-2">
              <button
                className={twMerge(
                  "rounded border border-success/40 bg-success/10 px-2 py-1 text-xs text-success transition-colors duration-150 hover:bg-success/20",
                  isUpdatingCategory && "pointer-events-none opacity-60",
                )}
                type="button"
                onClick={handleSave}
                disabled={isUpdatingCategory}>
                {isUpdatingCategory ? "Updating..." : "Save"}
              </button>
              <button
                className="rounded border border-border-color/30 px-2 py-1 text-xs text-subTitle transition-colors duration-150 hover:bg-foreground/10"
                type="button"
                onClick={() => { setIsEditing(false); setSelectedId(category_id ?? null) }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 rounded p-1 transition-colors duration-150 hover:bg-warning/20"
            type="button"
            onClick={() => setIsEditing(true)}>
            <span className="text-sm font-medium text-title">{currentName}</span>
            <CiEdit className="text-subTitle" />
          </button>
        )}
      </div>
    </div>
  )
}
