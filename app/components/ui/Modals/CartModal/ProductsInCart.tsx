"use client"

import { useCallback } from "react"
import useCartStore from "@/store/user/cartStore"
import Image from "next/image"
import { HiOutlineRefresh } from "react-icons/hi"

import { Button, Slider } from "../.."
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { formatCurrency } from "@/utils/currencyFormatter"
import { ClearProductQuantityButton, DecreaseProductQuantityButton, IncreaseProductQuantityButton } from "../../Buttons"
import { PaymentButtons } from "./PaymentButtons/PaymentButtons"
import { Product } from "@/(site)/components"

export function ProductsInCart() {
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()

  // To fix re-renders with zustand
  const increaseProductQuantity = useCallback((id: string, on_stock: number) => {
    cartStore.increaseProductQuantity(id, on_stock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const decreaseProductQuantity = useCallback((id: string) => {
    cartStore.decreaseProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const clearProductQuantity = useCallback((id: string) => {
    cartStore.clearProductQuantity(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-y-4">
      <section className="flex flex-col gap-y-8 w-[90%] mx-auto">
        {cartStore.productsData.map(productData => {
          return (
            <Product
              {...productData}
              containerClassName="border"
              increaseProductQuantity={increaseProductQuantity}
              decreaseProductQuantity={decreaseProductQuantity}
              clearProductQuantity={clearProductQuantity}
              key={productData.id}
            />
          )
        })}
        <footer className="flex flex-col min-[600px]:flex-row gap-8 justify-between">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-2xl text-center min-[600px]:text-start">
              Total:&nbsp;
              <span>{formatCurrency(cartStore.getProductsPrice())}</span>
            </h1>
            <Button variant="danger" onClick={areYouSureClearCartModal.openModal}>
              Clear cart
            </Button>
          </div>
          <PaymentButtons />
        </footer>
      </section>
    </div>
  )
}
