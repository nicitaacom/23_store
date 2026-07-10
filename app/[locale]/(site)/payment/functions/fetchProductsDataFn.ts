import { Dispatch, SetStateAction } from "react"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { logFn } from "@/utils/logFn"

export async function selectProductsDataFromDBFn(
  hasCartStoreInitialized: boolean,
  currentStep: number,
  setCurrentStep: Dispatch<SetStateAction<number>>,
  selectProductsData: () => Promise<void>,
  t: TI18nFunction,
) {
  logFn("!hasCartStoreInitialized - return")
  if (!hasCartStoreInitialized) return
  if (currentStep === 3) {
    try {
      await selectProductsData()
    } catch (error) {
      if (error instanceof Error) {
        logFn(t("payment.error.fetch_products_data"), error.message)
      }
    }
  }

  logFn(t("payment.products_data_fetched"))
  setCurrentStep(4)
}
