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

export function ProductsInCart() {
  const cartStore = useCartStore()
  const areYouSureClearCartModal = useAreYouSureClearCartModal()

  // To fix re-renders with zustand
  const increaseProductQuantity = useCallback((id: string) => {
    cartStore.increaseProductQuantity(id)
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
            <article
              className={`relative flex flex-col laptop:flex-row border-[1px] pb-2 tablet:pb-0 overflow-hidden ${
                productData.on_stock === 0 ? "border-warning" : ""
              }`}
              key={productData.id}>
              {productData.img_url.length === 1 ? (
                <Image
                  // aspect-video doesn't work - so I write width and height manually
                  className="w-full h-[480px]
                          laptop:aspect-video laptop:w-fit laptop:h-[200px]
                          desktop:w-[444px] desktop:h-[250px]
                          object-cover"
                  src={productData.img_url[0]}
                  alt="image"
                  width={480}
                  height={360}
                  priority
                />
              ) : (
                <Slider
                  containerClassName="w-full laptop:w-fit tablet:w-full tablet:h-[480px]"
                  className="w-full laptop:w-fit tablet:h-[480px]"
                  images={productData.img_url.map((image, index) => ({
                    src: image,
                    alt: `${productData.title}-${index + 1}`,
                  }))}
                  width={480}
                  height={360}
                />
              )}
              {/* width of div with title and price is 100% - image width */}
              <div
                className="relative laptop:w-[calc(100%-clamp(16.6875rem,0rem+34.7656vw,22.25rem))]
                     flex flex-col justify-between gap-y-4 px-2 py-1 tablet:pb-2">
                {/* HEADER - Title + price */}
                <header className="flex flex-col mobile:flex-row justify-between">
                  <div className="flex flex-col w-full mobile:w-[60%]">
                    <h1
                      className={`text-2xl text-center mobile:text-start truncate
                          ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                      {productData.title}
                    </h1>
                    {productData.on_stock === 0 && <p className="text-warning">Out of stock</p>}
                  </div>
                  <h1
                    className={`text-2xl text-center mobile:text-end align-top h-full mobile:w-[40%]
                        ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                    {formatCurrency(productData.price)}
                  </h1>
                </header>
                <footer className="flex flex-col gap-y-2 tablet:flex-row gap-x-8 justify-between">
                  {/* FOOTER LEFT - quantity + sub-total */}
                  <div className="flex flex-col items-center tablet:items-start">
                    <h5 className="flex flex-row text-center">
                      Quantity:&nbsp;<p>{productData.quantity}</p>
                    </h5>
                    <h5 className="flex flex-row">
                      Sub-total:&nbsp;<p>{formatCurrency(productData.quantity * productData.price)}</p>
                    </h5>
                  </div>

                  {/* FOOTER RIGHT - buttons */}
                  <div className="flex flex-row gap-x-2 justify-center tablet:justify-end max-h-[48px]">
                    {productData.on_stock > 0 && (
                      <>
                        <IncreaseProductQuantityButton onClick={() => increaseProductQuantity(productData.id)} />
                        <DecreaseProductQuantityButton onClick={() => decreaseProductQuantity(productData.id)} />
                        <ClearProductQuantityButton onClick={() => clearProductQuantity(productData.id)} />
                      </>
                    )}
                    {productData.on_stock === 0 && (
                      <Button className="text-lg flex flex-row gap-x-2" variant="info-outline">
                        <HiOutlineRefresh />
                      </Button>
                    )}
                  </div>
                </footer>
              </div>
            </article>
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
