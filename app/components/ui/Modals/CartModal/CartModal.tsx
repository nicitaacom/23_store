"use client"

import { useCallback, useEffect } from "react"
import { FaBitcoin, FaPaypal, FaStripeS } from "react-icons/fa"
import Image from "next/image"

import useCartStore from "@/store/user/cartStore"
import { OpenAreYouSureModalButton } from "@/components/Navbar/components"
import { ModalContainer } from "../../ModalContainer"
import EmptyCart from "./EmptyCart"
import { Button, Slider } from "../.."
import { formatCurrency } from "@/utils/currencyFormatter"
import { MdOutlineDeleteOutline } from "react-icons/md"
import { HiOutlineRefresh } from "react-icons/hi"
import useUserStore from "@/store/user/userStore"
import { useRouter } from "next/navigation"

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const cartStore = useCartStore()

  const router = useRouter()
  console.log("CartModal.tsx re-render")
  const { isAuthenticated } = useUserStore()
  if (!isAuthenticated) {
    router.push("/?modal=AuthModal&variant=login")
  }

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
                    className={`relative flex flex-col tablet:flex-row border-[1px] pb-2 tablet:pb-0 overflow-hidden ${
                      productData.on_stock === 0 ? "border-warning" : ""
                    }`}
                    key={productData.id}>
                    {productData.img_url.length === 1 ? (
                      <figure>
                        <Image
                          // aspect-video doesn't work - so I write width and height manually
                          className="w-full h-[300px]
                          tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                          laptop:w-[356px] laptop:h-[200px]
                          object-cover"
                          src={productData.img_url[0]}
                          alt="image"
                          width={480}
                          height={360}
                          priority
                        />
                      </figure>
                    ) : (
                      <Slider
                        //for 768-1024px aspect-ratio 16:9 from 150px hegiht till 356px
                        className="h-[300px]
                        tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                        laptop:w-[356px] laptop:h-[200px]
                        object-cover"
                        containerClassName="
                        tablet:w-[clamp(16.6875rem,0rem+34.7656vw,22.25rem)] tablet:h-[clamp(9.375rem,0rem+19.5313vw,12.5rem)] 
                        laptop:w-[356px] laptop:h-[200px]
                        desktop:h-[200px] desktop:w-[356px]
                        object-cover"
                        images={productData.img_url}
                        title={productData.title}
                      />
                    )}
                    {/* width of div with title and price is 100% - image width */}
                    <div
                      className="relative tablet:w-[calc(100%-clamp(16.6875rem,0rem+34.7656vw,22.25rem))] tablet:laptop:w-[calc(100%-356px)]
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
                            Quantity:&nbsp;<p>{quantity}</p>
                          </h5>
                          <h5 className="flex flex-row">
                            Sub-total:&nbsp;<p>{formatCurrency(quantity * productData.price)}</p>
                          </h5>
                        </div>

                        {/* FOOTER RIGHT - buttons */}
                        <div className="flex flex-row gap-x-2 justify-center tablet:justify-end max-h-[48px]">
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
                            className="font-secondary font-thin max-h-[48px]"
                            variant="danger-outline"
                            onClick={() => clearProductQuantity(productData.id)}>
                            <p className="hidden laptop:flex font-bold">Clear</p>
                            <MdOutlineDeleteOutline />
                          </Button>
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
                  <OpenAreYouSureModalButton />
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                    Metamask
                    <Image className="w-[20px] h-[20px]" width={32} height={32} src="/metamask.png" alt="metamask" />
                  </Button>
                  <div className="tooltip h-[40px]">
                    <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                      Bitcoin
                      <FaBitcoin />
                      <div className="tooltiptext bg-background whitespace-nowrap">I need ca 100$ to create it</div>
                    </Button>
                  </div>
                  <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                    PayPal
                    <FaPaypal />
                  </Button>
                  <Button className="flex flex-row gap-x-1 w-full laptop:w-full" variant="info">
                    Stripe
                    <FaStripeS />
                  </Button>
                </div>
              </footer>
            </section>
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>
    </ModalContainer>
  )
}
