"use client"

import { useState } from "react"
import Image from "next/image"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { AdminPanelProductSearch } from "./AdminPanelProductSearch"
import { OwnerProduct } from "./OwnerProduct"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useScopedI18n } from "@/locales/client"
import { filterProductsBySearchQuery } from "@/utils/productSearch"

interface EditProductForm {
  ownerProducts: TProductDB[]
}

export function EditProductForm({ ownerProducts }: EditProductForm) {
  const t = useScopedI18n("product")
  const isDarkMode = useDarkModeStore().isDarkMode
  const [searchQuery, setSearchQuery] = useState("")
  const filteredProducts = searchQuery.trim() ? filterProductsBySearchQuery(ownerProducts, searchQuery) : ownerProducts

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1080px] flex-col">
      {ownerProducts.length > 0 ? (
        <>
          <div className="shrink-0 pb-2">
            <AdminPanelProductSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              visibleCount={filteredProducts.length}
              totalCount={ownerProducts.length}
            />
          </div>

          {filteredProducts.length > 0 ? (
            <div className="flex flex-col gap-2 pb-1">
              {filteredProducts.map(ownerProduct => (
                <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div
                className={twMerge(
                  "mx-auto flex w-full max-w-[440px] flex-col items-center justify-center gap-4 rounded bg-background/35 px-4 py-5 text-center",
                )}>
                <Image
                  src={isDarkMode ? "/no-products-found-dark.png" : "/no-products-found-light.png"}
                  alt="no-products-found.png"
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
            "mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-4 rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center",
          )}>
          <Image
            src={isDarkMode ? "/no-products-to-edit-dark.png" : "/no-products-to-edit-light.png"}
            alt="no-products-to-edit.png"
            width={176}
            height={176}
          />
          <div>
            <h1 className="text-xl font-semibold">{t("no_products_to_edit")}</h1>
            <p className="mt-2 text-sm text-subTitle">Create a product first, then return here to edit it.</p>
          </div>
        </div>
      )}
    </div>
  )
}
