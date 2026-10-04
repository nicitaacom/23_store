"use client"

import Image from "next/image"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function NoProductsFound() {
  const { isDarkMode } = useDarkModeStore()
  const t = useScopedI18n("product")

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center gap-y-8 px-8 pb-16 max-[767px]:gap-y-2 max-[767px]:px-0 max-[767px]:pb-20">
      <Image
        className="max-[767px]:h-auto max-[767px]:w-36"
        src={isDarkMode ? "/no-products-found-dark.png" : "/no-products-found-light.png"}
        alt={t("no_products_found")}
        width={256}
        height={256}
      />
      <h1 className="h-full text-4xl font-bold text-center max-[767px]:text-2xl">{t("no_products_found")}</h1>
    </div>
  )
}
