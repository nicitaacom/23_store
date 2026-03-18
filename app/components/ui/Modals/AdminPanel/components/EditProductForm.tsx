"use client"

import Image from "next/image"

import { TProductDB } from "@/ts/product/TProductDB"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { OwnerProduct } from "./OwnerProduct"
import { useScopedI18n } from "@/locales/client"

interface EditProductForm {
  ownerProducts: TProductDB[]
}

export function EditProductForm({ ownerProducts }: EditProductForm) {
  const t = useScopedI18n("product")
  const isDarkMode = useDarkModeStore().isDarkMode

  return (
    <div className="mx-auto h-full w-full max-w-[1080px]">
      {ownerProducts.length > 0 ? (
        <div className="flex h-full flex-col gap-y-3">
          {ownerProducts.map(ownerProduct => (
            <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <div className="mx-auto flex h-full w-full max-w-[440px] flex-col items-center justify-center gap-y-5 rounded-2xl border border-border-color/70 bg-background/20 px-6 py-10 text-center">
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
