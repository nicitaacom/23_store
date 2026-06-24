"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import useCartStore from "@/store/user/cartStore"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import EmptyCart from "./EmptyCart"
import { ProductsInCart } from "./ProductsInCart"
import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"
import { useI18n } from "@/locales/client"

export function CartModal() {
  const t = useI18n()
  const router = useRouter()
  const cartStore = useCartStore()
  const [isSkeleton, setIsSkeleton] = useState(false)

  useEffect(() => {
    setIsSkeleton(true)
    async function fetchProductsData() {
      try {
        await cartStore.fetchProductsData()
      } finally {
        setIsSkeleton(false)
      }
    }
    fetchProductsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    router.prefetch("/payment")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      className="h-[80vh] w-full overflow-hidden laptop:max-h-[700px] laptop:max-w-[1100px] desktop:max-h-[75vh] desktop:max-w-[80vw]"
      modalQuery="CartModal">
      <div className="relative flex h-full w-full flex-col gap-2 overflow-hidden p-3 laptop:p-4">
        <h1 className="shrink-0 text-center text-xl font-semibold text-title">
          {t("modal.cart.label")}
        </h1>
        <div className="h-px w-full bg-border-color/20" />
        <section className="min-h-0 flex-1 overflow-hidden">
          {isSkeleton ? <ProductsSkeleton /> : cartStore.productsData.length > 0 ? <ProductsInCart /> : <EmptyCart />}
        </section>
      </div>
    </ModalQueryContainer>
  )
}
