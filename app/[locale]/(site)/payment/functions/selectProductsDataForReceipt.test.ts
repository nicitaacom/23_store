import { describe, expect, it, vi } from "vitest"

import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { selectProductsDataForReceipt } from "./selectProductsDataForReceipt"

const translate = vi.fn(() => "translated") as unknown as TI18nFunction
const selectedProducts = [{ id: "product-id" }] as TProductAfterDB[]

describe("selectProductsDataForReceipt", () => {
  it("does not skip from customer-email step to email rendering", async () => {
    const selectProductsData = vi.fn(async () => selectedProducts)
    const setCurrentStep = vi.fn()
    const setReceiptProducts = vi.fn()

    await selectProductsDataForReceipt(true, 2, setCurrentStep, selectProductsData, setReceiptProducts, translate)

    expect(selectProductsData).not.toHaveBeenCalled()
    expect(setReceiptProducts).not.toHaveBeenCalled()
    expect(setCurrentStep).not.toHaveBeenCalled()
  })

  it("waits at product selection until the cart store is initialized", async () => {
    const selectProductsData = vi.fn(async () => selectedProducts)
    const setCurrentStep = vi.fn()
    const setReceiptProducts = vi.fn()

    await selectProductsDataForReceipt(false, 3, setCurrentStep, selectProductsData, setReceiptProducts, translate)

    expect(selectProductsData).not.toHaveBeenCalled()
    expect(setReceiptProducts).not.toHaveBeenCalled()
    expect(setCurrentStep).not.toHaveBeenCalled()
  })

  it("advances to email rendering after selecting product data", async () => {
    const selectProductsData = vi.fn(async () => selectedProducts)
    const setCurrentStep = vi.fn()
    const setReceiptProducts = vi.fn()

    await selectProductsDataForReceipt(true, 3, setCurrentStep, selectProductsData, setReceiptProducts, translate)

    expect(selectProductsData).toHaveBeenCalledOnce()
    expect(setReceiptProducts).toHaveBeenCalledWith(selectedProducts)
    expect(setCurrentStep).toHaveBeenCalledWith(4)
  })

  it("stays at product selection when the cart has no selectable products", async () => {
    const selectProductsData = vi.fn(async () => [])
    const setCurrentStep = vi.fn()
    const setReceiptProducts = vi.fn()

    await selectProductsDataForReceipt(true, 3, setCurrentStep, selectProductsData, setReceiptProducts, translate)

    expect(setReceiptProducts).not.toHaveBeenCalled()
    expect(setCurrentStep).not.toHaveBeenCalled()
  })

  it("stays at product selection when the database request fails", async () => {
    const selectProductsData = vi.fn(async () => {
      throw new Error("database unavailable")
    })
    const setCurrentStep = vi.fn()
    const setReceiptProducts = vi.fn()

    await selectProductsDataForReceipt(true, 3, setCurrentStep, selectProductsData, setReceiptProducts, translate)

    expect(setReceiptProducts).not.toHaveBeenCalled()
    expect(setCurrentStep).not.toHaveBeenCalled()
  })
})
