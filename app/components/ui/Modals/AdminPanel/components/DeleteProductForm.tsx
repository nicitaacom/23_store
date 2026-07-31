"use client"

import { useState } from "react"
import Image from "next/image"
import { BiTrash } from "react-icons/bi"
import { MdChecklist, MdClose } from "react-icons/md"

import { IPendingDeleteProduct } from "@/ts/interfaces/IPendingDeleteProduct"
import { TAdminProductSort } from "@/ts/types/TAdminProductSort"
import { TProductDB } from "@/ts/product/TProductDB"
import { useAdminPanelDirty } from "../AdminPanelDirtyContext"
import { AdminPanelProductSearch } from "./AdminPanelProductSearch"
import { AdminPanelProductSort } from "./AdminPanelProductSort"
import { OwnerDeleteProduct } from "./OwnerDeleteProduct"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import { sortAdminProducts } from "@/utils/adminProductSort"
import { toProductLocale } from "@/utils/product"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { Button } from "@/components/ui"

interface DeleteProductForm {
  ownerProducts: TProductDB[]
  onRequestDelete: (products: IPendingDeleteProduct | IPendingDeleteProduct[]) => void
  productSort: TAdminProductSort
  onProductSortChange: (sort: TAdminProductSort) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function DeleteProductForm({
  ownerProducts,
  onRequestDelete,
  productSort,
  onProductSortChange,
}: DeleteProductForm) {
  const t = useScopedI18n("product")
  const locale = toProductLocale(useCurrentLocale())
  const isDarkMode = useDarkModeStore().isDarkMode
  const [searchQuery, setSearchQuery] = useState("")
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const matchingProducts = searchQuery.trim() ? filterProductsBySearchQuery(ownerProducts, searchQuery) : ownerProducts
  const filteredProducts = sortAdminProducts(matchingProducts, productSort, locale)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map(product => product.id)))
    }
  }

  function exitBulkMode() {
    setIsBulkMode(false)
    setSelectedIds(new Set())
  }

  const selectedProducts = ownerProducts.filter(product => selectedIds.has(product.id))
  const allSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length
  const someSelected = selectedIds.size > 0 && !allSelected
  useAdminPanelDirty("delete-product-selection", selectedIds.size > 0)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1080px] flex-col">
      {ownerProducts.length > 0 ? (
        <>
          {/* Toolbar */}
          <div className="shrink-0 pb-3">
            <div className="flex items-center gap-2">
              {isBulkMode && (
                <label className="flex shrink-0 cursor-pointer items-center gap-2 pl-0.5">
                  <input
                    className="h-4 w-4 cursor-pointer accent-danger"
                    type="checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleSelectAll}
                  />
                </label>
              )}
              <div className="flex-1">
                <AdminPanelProductSearch
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  visibleCount={filteredProducts.length}
                  totalCount={ownerProducts.length}
                />
              </div>
              <AdminPanelProductSort value={productSort} onChange={onProductSortChange} />
              {isBulkMode ? (
                <>
                  <Button
                    className="shrink-0 gap-1.5"
                    size="sm"
                    variant="danger"
                    disabled={selectedIds.size === 0}
                    onClick={() =>
                      onRequestDelete(
                        selectedProducts.map(product => ({
                          id: product.id,
                          title: product.translations.en?.title ?? product.id,
                        })),
                      )
                    }>
                    <BiTrash size={14} />
                    {t("delete_action")}
                    {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                  </Button>
                  <Button className="shrink-0" size="sm" variant="default-outline" onClick={exitBulkMode}>
                    <MdClose size={15} />
                  </Button>
                </>
              ) : (
                <Button className="shrink-0 gap-1.5" size="sm" variant="default-outline" onClick={() => setIsBulkMode(true)}>
                  <MdChecklist size={15} />
                  {t("select_action")}
                </Button>
              )}
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="flex flex-col gap-2 pb-1">
              {filteredProducts.map(ownerProduct => (
                <OwnerDeleteProduct
                  {...ownerProduct}
                  key={ownerProduct.id}
                  onRequestDelete={(id, title) => onRequestDelete({ id, title })}
                  isBulkMode={isBulkMode}
                  isSelected={selectedIds.has(ownerProduct.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="mx-auto flex w-full max-w-[440px] flex-col items-center justify-center gap-4 rounded px-4 py-5 text-center">
                <Image
                  src={isDarkMode ? "/no-products-found-dark.png" : "/no-products-found-light.png"}
                  alt={t("no_products_found")}
                  width={176}
                  height={176}
                />
                <div>
                  <h1 className="text-xl font-semibold">{t("admin_search_empty_title")}</h1>
                  <p className="mt-2 text-sm text-subTitle">{t("admin_search_empty_subtitle")}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 rounded px-4 py-5 text-center">
          <Image
            src={isDarkMode ? "/no-products-to-delete-dark.png" : "/no-products-to-delete-light.png"}
            alt={t("no_products_to_delete")}
            width={176}
            height={176}
          />
          <div>
            <h1 className="text-xl font-semibold">{t("no_products_to_delete")}</h1>
            <p className="mt-2 text-sm text-subTitle">{t("no_products_to_delete_subtitle")}</p>
          </div>
        </div>
      )}
    </div>
  )
}
