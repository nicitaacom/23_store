import { Dispatch, SetStateAction, useEffect } from "react"

import { fetchProductsDataFromDBFn } from "../functions/fetchProductsDataFn"
import useCartStore from "@/store/user/cartStore"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"

export const useFetchProductsData = (currentStep: number, setCurrentStep: Dispatch<SetStateAction<number>>) => {
  const { hasCartStoreInitialized } = useLoading()
  const cartStore = useCartStore()
  const t = useI18n()

  useEffect(() => {
    if (!hasCartStoreInitialized) return
    // to avoid issue where products is {} because cartStore is not initialized
    fetchProductsDataFromDBFn(hasCartStoreInitialized, currentStep, setCurrentStep, cartStore.fetchProductsData, t)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCartStoreInitialized])
}
