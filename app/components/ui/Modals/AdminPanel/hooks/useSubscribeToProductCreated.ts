"use client"

import { MutableRefObject, useEffect, useRef } from "react"

import { getPusherClient } from "@/libs/pusher"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { TProductDB } from "@/ts/product/TProductDB"
import { createRawProductTranslations } from "@/utils/product"
import { getUserId } from "@/utils/getUserId"

export type PendingCreatedProduct = {
  optimisticProductId: string
  owner_id: string
  title: string
  description: string
  price: number
  on_stock: number
  img_url: string[]
  variants: TProductDB["variants"]
}

type ProductCreatedEventPayload = {
  id: string
  price_id: string
  owner_id: string
  price: number
  on_stock: number
  title: string
}

function matchPendingCreatedProduct(
  pendingCreatedProductsRef: MutableRefObject<PendingCreatedProduct[]>,
  payload: ProductCreatedEventPayload,
) {
  const matchingStrategies = [
    (product: PendingCreatedProduct) =>
      product.owner_id === payload.owner_id &&
      product.title === payload.title &&
      product.price === payload.price &&
      product.on_stock === payload.on_stock,
    (product: PendingCreatedProduct) => product.owner_id === payload.owner_id && product.title === payload.title && product.price === payload.price,
    (product: PendingCreatedProduct) => product.owner_id === payload.owner_id && product.title === payload.title,
    (product: PendingCreatedProduct) => product.owner_id === payload.owner_id,
  ]

  for (const isMatch of matchingStrategies) {
    const productIndex = pendingCreatedProductsRef.current.findIndex(isMatch)
    if (productIndex >= 0) {
      const [matchedProduct] = pendingCreatedProductsRef.current.splice(productIndex, 1)
      return matchedProduct
    }
  }

  return null
}

export function useSubscribeToProductCreated({
  pendingCreatedProductsRef,
  decreasePendingTranslations,
}: {
  pendingCreatedProductsRef: MutableRefObject<PendingCreatedProduct[]>
  decreasePendingTranslations: (showCompletedToast?: boolean) => void
}) {
  const decreasePendingTranslationsRef = useRef(decreasePendingTranslations)

  useEffect(() => {
    decreasePendingTranslationsRef.current = decreasePendingTranslations
  }, [decreasePendingTranslations])

  useEffect(() => {
    const pusherClient = getPusherClient()

    const productCreatedHandler = (payload: ProductCreatedEventPayload) => {
      if (!payload?.id || !payload?.price_id || !payload?.owner_id || !payload?.title) return
      if (payload.owner_id !== getUserId()) return

      const matchedPendingProduct = matchPendingCreatedProduct(pendingCreatedProductsRef, payload)

      const createdProduct: TProductDB = {
        id: payload.id,
        price_id: payload.price_id,
        owner_id: payload.owner_id,
        translations: createRawProductTranslations(payload.title, matchedPendingProduct?.description || ""),
        price: payload.price,
        on_stock: payload.on_stock,
        img_url: matchedPendingProduct?.img_url?.length ? matchedPendingProduct.img_url : ["/placeholder.jpg"],
        variants: matchedPendingProduct?.variants ?? null,
      }

      console.info("[products] received product:created", {
        title: payload.title,
        product: createdProduct,
      })

      if (matchedPendingProduct) {
        useOwnerProductsStore.getState().replaceProduct(matchedPendingProduct.optimisticProductId, createdProduct)
      } else {
        useOwnerProductsStore.getState().addProduct(createdProduct)
      }

      useOwnerProductsStore.getState().setError(null)
      decreasePendingTranslationsRef.current(true)
    }

    pusherClient.subscribe("products")
    pusherClient.bind("product:created", productCreatedHandler)

    return () => {
      pusherClient.unsubscribe("products")
      pusherClient.unbind("product:created", productCreatedHandler)
    }
  }, [pendingCreatedProductsRef])
}
