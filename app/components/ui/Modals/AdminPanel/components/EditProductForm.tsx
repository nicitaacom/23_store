"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { twMerge } from "tailwind-merge"

import { TAdminProductSort } from "@/ts/types/TAdminProductSort"
import { TProductDB } from "@/ts/product/TProductDB"
import { AdminPanelProductSearch } from "./AdminPanelProductSearch"
import { AdminPanelProductSort } from "./AdminPanelProductSort"
import { OwnerProduct } from "./OwnerProduct"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import { sortAdminProducts } from "@/utils/adminProductSort"
import { toProductLocale } from "@/utils/product"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { NearRows } from "@/components/ui/NearRows"

interface EditProductForm {
  ownerProducts: TProductDB[]
  productSort: TAdminProductSort
  onProductSortChange: (sort: TAdminProductSort) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function EditProductForm({ ownerProducts, productSort, onProductSortChange }: EditProductForm) {
  const t = useScopedI18n("product")
  const locale = toProductLocale(useCurrentLocale())
  const isDarkMode = useDarkModeStore().isDarkMode
  const [searchQuery, setSearchQuery] = useState("")
  const [span, setSpan] = useState({ from: 1, to: 40 })
  const reportSpan = useCallback((from: number, to: number) => {
    setSpan(current => (current.from === from && current.to === to ? current : { from, to }))
  }, [])
  const matchingProducts = searchQuery.trim() ? filterProductsBySearchQuery(ownerProducts, searchQuery) : ownerProducts
  const filteredProducts = sortAdminProducts(matchingProducts, productSort, locale)
  const rangeRows = filteredProducts.map(row => ({
    id: row.id,
    node: <OwnerProduct {...row} />,
  }))

  return (
    <div className="pinned-search-host mx-auto flex h-full min-h-0 w-full max-w-[1080px] flex-col">
      {ownerProducts.length > 0 ? (
        <>
          <div className="shrink-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <AdminPanelProductSearch
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  visibleCount={filteredProducts.length}
                  totalCount={filteredProducts.length}
                  fromIndex={filteredProducts.length === 0 ? 0 : span.from}
                  toIndex={filteredProducts.length === 0 ? 0 : Math.min(span.to, filteredProducts.length)}
                />
              </div>
              <AdminPanelProductSort value={productSort} onChange={onProductSortChange} />
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <NearRows rows={rangeRows} onSpan={reportSpan} />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div
                className={twMerge(
                  "mx-auto flex w-full max-w-[440px] flex-col items-center justify-center gap-4 rounded bg-background/35 px-4 py-5 text-center",
                )}>
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
        <div
          className={twMerge(
            "mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 rounded bg-background/35 px-4 py-5 text-center",
          )}>
          <Image
            src={isDarkMode ? "/no-products-to-edit-dark.png" : "/no-products-to-edit-light.png"}
            alt={t("no_products_to_edit")}
            width={176}
            height={176}
          />
          <div>
            <h1 className="text-xl font-semibold">{t("no_products_to_edit")}</h1>
            <p className="mt-2 text-sm text-subTitle">{t("no_products_to_edit_subtitle")}</p>
          </div>
        </div>
      )}
    </div>
  )
}
