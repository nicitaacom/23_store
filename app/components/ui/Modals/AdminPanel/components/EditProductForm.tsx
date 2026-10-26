"use client"

import { useEffect, useRef, useState } from "react"
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

const PAGE_SIZE = 20

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
  const [shownCount, setShownCount] = useState(PAGE_SIZE)
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const matchingProducts = searchQuery.trim() ? filterProductsBySearchQuery(ownerProducts, searchQuery) : ownerProducts
  const filteredProducts = sortAdminProducts(matchingProducts, productSort, locale)

  const rowOrderKey = filteredProducts.map(row => row.id).join("\0")
  const shownRows = filteredProducts.slice(0, shownCount)
  const [appliedOrderKey, setAppliedOrderKey] = useState(rowOrderKey)
  if (rowOrderKey !== appliedOrderKey) {
    setAppliedOrderKey(rowOrderKey)
    setShownCount(PAGE_SIZE)
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [appliedOrderKey])

  useEffect(() => {
    if (!sentinel) return
    const root = listRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShownCount(count => count + PAGE_SIZE)
      },
      { root, rootMargin: "320px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, shownCount, rowOrderKey])

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
                  totalCount={ownerProducts.length}
                />
              </div>
              <AdminPanelProductSort value={productSort} onChange={onProductSortChange} />
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="catalog-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1 pr-1" ref={listRef}>
              {shownRows.map(ownerProduct => (
                <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
              ))}
              {shownRows.length < filteredProducts.length ? <div className="h-px shrink-0" ref={setSentinel} /> : null}
            </div>
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
