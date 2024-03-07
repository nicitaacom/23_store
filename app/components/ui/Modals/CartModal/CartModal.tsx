"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import useCartStore from "@/store/user/cartStore"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import EmptyCart from "./EmptyCart"
import { ProductsInCart } from "./ProductsInCart"
import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"

export interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
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
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] desktop:max-w-[75vw] desktop:max-h-[60vh] pt-8 pb-0"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 w-full h-full pb-8 overflow-y-auto">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {/* SHOW EMPTY CART IF NO PRODUCTS */}
        {isSkeleton ? (
          <div>
            <h1 className="text-2xl text-center">TODO - cartModal loading skeleton</h1>
            <ProductsSkeleton />
          </div>
        ) : cartStore.productsData.length > 0 ? (
          <ProductsInCart />
        ) : (
          <EmptyCart />
        )}
      </div>
    </ModalQueryContainer>
  )
}
