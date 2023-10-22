"use client"

import { OpenAreYouSureModalButton } from "@/components/Navbar/components"
import { ModalContainer } from "../../ModalContainer"
import useCartStore from "@/store/user/cartStore"
import EmptyCart from "./EmptyCart"
import Image from "next/image"
import { Slider } from "../.."

interface CartModalProps {
  label: string
}

export function CartModal({ label }: CartModalProps) {
  const cartStore = useCartStore()

  cartStore.fetchProductsData()
  return (
    <ModalContainer
      className="w-screen h-screen laptop:max-w-[1024px] laptop:max-h-[640px] pt-8"
      modalQuery="CartModal">
      <div className="relative flex flex-col gap-y-8 pb-8 w-full h-full overflow-y-scroll">
        <h1 className="text-4xl text-center whitespace-nowrap mt-4">{label}</h1>
        {cartStore.productsData.length > 0 ? (
          <div className="flex flex-col gap-y-4">
            <section className="flex flex-col gap-y-8 w-[90%] mx-auto">
              {cartStore.productsData.map(productData => (
                <article
                  className={`flex flex-col laptop:flex-row border-[1px] ${
                    productData.on_stock === 0 && "border-warning"
                  }`}
                  key={productData.id}>
                  {productData.img_url.length === 1 ? (
                    <Image
                      className="w-full tablet:aspect-video h-[300px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover"
                      src={productData.img_url[0]}
                      alt="image"
                      width={480}
                      height={360}
                      priority
                    />
                  ) : (
                    <Slider
                      containerClassName="tablet:w-fit"
                      className="h-[300px]"
                      images={productData.img_url}
                      title={productData.title}
                    />
                  )}
                  <div>title:{productData.title}</div>
                  <div>sub_title:{productData.sub_title}</div>

                  <div>{productData.price}</div>
                </article>
              ))}
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
