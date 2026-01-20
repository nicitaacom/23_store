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

  // fetch products data to render UI from data with ICartRecord type
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

  // prefetch success and failed routes for better performance
  // https://nextjs.org/docs/pages/api-reference/functions/use-router#routerprefetch
  // in my case I have payment instad of login
  useEffect(() => {
    router.prefetch("/payment")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      className="w-full laptop:max-w-[1100px] desktop:max-w-[80vw] h-[80vh] laptop:max-h-[700px] desktop:max-h-[75vh] pt-6 pb-6 overflow-hidden"
      modalQuery="CartModal">
      <div className="relative w-full h-full flex flex-col gap-y-4 overflow-hidden">
        <h1 className="text-3xl laptop:text-4xl font-bold text-center bg-gradient-to-r from-success via-success-accent to-success bg-clip-text text-transparent shrink-0">
          {t("modal.cart.label")}
        </h1>

        <section className="flex-1 w-[95%] mx-auto overflow-hidden">
          {isSkeleton ? <ProductsSkeleton /> : cartStore.productsData.length > 0 ? <ProductsInCart /> : <EmptyCart />}
        </section>
      </div>
    </ModalQueryContainer>
  )
}
