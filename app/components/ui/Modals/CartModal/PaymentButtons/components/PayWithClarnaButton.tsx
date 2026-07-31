"use client"

import { SiKlarna } from "react-icons/si"
import { twMerge } from "tailwind-merge"

import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function PayWithKlarnaButton() {
  const toast = useToast()
  const t = useI18n()
  const { isLoading, setIsLoading } = useLoading()

  // const klarnaProductsQuery = cartStore.productsData
  //   .filter(product => product.on_stock > 0)
  //   .map(product => ({
  //     price: product.price_id,
  //     quantity: product.quantity,
  //   }))
  //   .map(item => `${encodeURIComponent(JSON.stringify(item))}`)
  //   .join("&")

  async function createKlarnaSession() {
    setIsLoading(true)
    try {
      await productsSDK.createKlarnaSession()
    } catch (error) {
      toast.show("error", t("payment.error.klarna_session_title"), error instanceof Error ? error.message : String(error))
    }
    setIsLoading(false)
  }

  return (
    <Button
      className={twMerge(
        "flex flex-row gap-x-1 w-full laptop:w-full",
        isLoading && "opacity-50 cursor-default pointer-events-none",
      )}
      variant="info"
      onClick={createKlarnaSession}>
      {/* Klarna is a brand name, not translated */}
      {"Klarna"}
      <SiKlarna />
    </Button>
  )
}
