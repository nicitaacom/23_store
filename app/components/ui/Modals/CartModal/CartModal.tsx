"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import useCartStore from "@/store/user/cartStore"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import EmptyCart from "./EmptyCart"
import { ProductsInCart } from "./ProductsInCart"

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const router = useRouter()
  const cartStore = useCartStore()

  const { isAuthenticated } = useUserStore()

  if (!isAuthenticated) {
    router.push("/?modal=AuthModal&variant=login")
  }

  // fetch products data to render UI from data with ICartRecord type
  useEffect(() => {
    cartStore.fetchProductsData()
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
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] pt-8"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {/* SHOW EMPTY CART IF NO PRODUCTS */}
        {cartStore.productsData.length > 0 ? <ProductsInCart /> : <EmptyCart />}
      </div>
    </ModalQueryContainer>
  )
}
