"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import useUserStore from "@/store/user/userStore"
import useCartStore from "@/store/user/cartStore"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import EmptyCart from "./EmptyCart"
import { ProductsInCart } from "./ProductsInCart"
import { useLoading } from "@/store/ui/useLoading"
import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const router = useRouter()
  const cartStore = useCartStore()
  const { isLoading, setIsLoading } = useLoading()
  const { isAuthenticated } = useUserStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // fetch products data to render UI from data with ICartRecord type
  useEffect(() => {
    setIsLoading(true)
    async function fetchProductsData() {
      await cartStore.fetchProductsData()
    }
    fetchProductsData()
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // prefetch success and failed routes for better performance
  // https://nextjs.org/docs/pages/api-reference/functions/use-router#routerprefetch
  // in my case I have payment instad of login
  useEffect(() => {
    router.prefetch("/payment")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <ModalQueryContainer
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] desktop:max-w-[75vw] desktop:max-h-[60vh] pt-8"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {/* SHOW EMPTY CART IF NO PRODUCTS */}
        {isLoading ? (
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
