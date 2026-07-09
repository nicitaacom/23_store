"use client"

import Image from "next/image"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useScopedI18n } from "@/locales/client"

export function NoProductsFound() {
  const { isDarkMode } = useDarkModeStore()
  const t = useScopedI18n("product")

  return (
    <div className="min-h-[calc(100vh-64px)] px-8 flex flex-col gap-y-8 justify-center items-center pb-16">
      <Image
        src={isDarkMode ? "/no-products-found-dark.png" : "/no-products-found-light.png"}
        alt="No products found"
        width={256}
        height={256}
      />
      <h1 className="h-full text-4xl font-bold text-center">{t("no_products_found")}</h1>
    </div>
  )
}
