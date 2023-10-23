"use client"

import { useCallback, useEffect } from "react"
import Image from "next/image"

import useCartStore from "@/store/user/cartStore"
import { OpenAreYouSureModalButton } from "@/components/Navbar/components"
import { ModalContainer } from "../../ModalContainer"
import EmptyCart from "./EmptyCart"
import { Button, Slider } from "../.."
import { formatCurrency } from "@/utils/currencyFormatter"
import { MdOutlineDeleteOutline } from "react-icons/md"
import { HiOutlineRefresh } from "react-icons/hi"

interface CartModalProps {
  quantity: number
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const cartStore = useCartStore()

  console.log("CartModal.tsx re-render")

  useEffect(() => {
    cartStore.fetchProductsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <ModalContainer
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] pt-8"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {cartStore.productsData.length > 0 ? (
          <div className="flex flex-col gap-y-4">
            <section className="flex flex-col gap-y-8 w-[90%] mx-auto">
              {cartStore.productsData.map(productData => {
                const quantity = cartStore.products[productData.id].quantity ?? 0
                return (
                  <article
                    className={`flex flex-col tablet:flex-row border-[1px] ${
                      productData.on_stock === 0 && "border-warning"
                    }`}
                    key={productData.id}>
                    {productData.img_url.length === 1 ? (
                      <Image
                        className="tablet:aspect-video w-full tablet:w-[45%] object-cover"
                        src={productData.img_url[0]}
                        alt="image"
                        width={480}
                        height={360}
                        priority
                      />
                    ) : (
                      <Slider
                        containerClassName="tablet:aspect-video tablet:w-[45%] laptop:w-[45%] object-cover"
                        className="h-auto tablet:h-auto laptop:h-auto desktop:h-auto tablet:aspect-video tablet:w-full laptop:w-full object-cover"
                        images={productData.img_url}
                        title={productData.title}
                      />
                    )}
                    {/* width of div with title and price is 100% - image width */}
                    <div className="flex flex-col justify-between gap-y-4 w-full tablet:w-[55%] px-2 py-1">
                      {/* HEADER - Title + price */}
                      <div className="flex flex-row justify-between">
                        <div className="flex flex-col w-full mobile:w-[60%]">
                          <h1
                            className={`text-2xl truncate
                          ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                            {productData.title}
                          </h1>
                          {productData.on_stock === 0 && <p className="text-warning">Out of stock</p>}
                        </div>
                        <h1
                          className={`text-2xl text-end align-top h-full mobile:w-[40%]
                        ${productData.on_stock === 0 ? "text-subTitle" : ""}`}>
                          {formatCurrency(productData.price)}
                        </h1>
                      </div>
                      <div className="flex flex-col gap-y-2 tablet:flex-row gap-x-8 justify-between">
                        {/* FOOTER LEFT - quantity + sub-total */}
                        <div className="flex flex-col items-center tablet:items-start">
                          <h5 className="flex flex-row text-center">
                            Quantity:&nbsp;<p>{quantity}</p>
                          </h5>
                          <h5 className="flex flex-row">
                            Sub-total:&nbsp;<p>{formatCurrency(quantity * productData.price)}</p>
                          </h5>
                        </div>

                        {/* FOOTER RIGHT - buttons */}
                        <div className="flex flex-row gap-x-2 justify-center tablet:justify-end">
                          {productData.on_stock > 0 && (
                            <>
                              <Button
                                className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
                                variant="success-outline"
                                onClick={() => increaseProductQuantity(productData.id)}>
                                +
                              </Button>
                              <Button
                                className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
                                variant="danger-outline"
                                onClick={() => decreaseProductQuantity(productData.id)}>
                                -
                              </Button>
                            </>
                          )}
                          <Button
                            className="font-secondary font-thin max-h-[50px]"
                            variant="danger-outline"
                            onClick={() => clearProductQuantity(productData.id)}>
                            <p className=""></p>
                            <MdOutlineDeleteOutline />
                          </Button>
                          {productData.on_stock === 0 && (
                            <Button className="text-lg flex flex-row gap-x-2" variant="info-outline">
                              <HiOutlineRefresh />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          </div>
        ) : (
          <EmptyCart />
        )}
        <div>
          <OpenAreYouSureModalButton />
        </div>
      </div>
    </ModalContainer>
  )
}
