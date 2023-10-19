"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Button, Slider } from "@/components/ui"
import {
  ClearProductQuantityButton,
  DecreaseProductQuantityButton,
  IncreaseProductQuantityButton,
  RequestReplanishmentButton,
} from "@/components/ui/Buttons"
import Image from "next/image"
import { formatCurrency } from "@/utils/currencyFormatter"
import { ICartProduct } from "@/interfaces/ICartProduct"
import { useState } from "react"
import useUserStore from "@/store/user/userStore"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import supabaseClient from "@/utils/supabaseClient"
import getCartFromDB from "@/actions/getCart"

export default function Product({ ...product }: ICartProduct) {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const anonymousCart = useAnonymousCartStore()

  const [productQuantity, setProductQuantity] = useState(product.quantity)

  //Increase product quantity
  const {
    mutate: increaseProductQuantity,
    isPending: isPendingIncreaseProductQuantity,
    context: contextIncreaseProductQuantity,
  } = useMutation({
    mutationFn: async () => {
      const DB_cart = await getCartFromDB()
      const updatedProducts = DB_cart
      /* logic to update cart_quantity in DB */
      //update cart quantity first
      const { data: cart_quantity } = await supabaseClient
        .from("users_cart")
        .select("cart_quantity")
        .eq("id", userStore.userId)
        .single()
      if (cart_quantity?.cart_quantity !== null && cart_quantity?.cart_quantity !== undefined) {
        const updatedCartQuantity =
          updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id) === -1
            ? cart_quantity.cart_quantity + 1
            : updatedProducts[updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id)]
                .quantity ===
              updatedProducts[updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id)].on_stock
            ? cart_quantity.cart_quantity
            : cart_quantity.cart_quantity + 1

        /* logic to update cart_products in DB */
        const productInDBCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)
        if (productInDBCartIndex === -1) {
          //Add new product in DB_cart if it doesn't exist
          updatedProducts.push({ ...product, quantity: 1 })
        } else {
          // If product already exists - update the quantity
          updatedProducts[productInDBCartIndex].on_stock === updatedProducts[productInDBCartIndex].quantity
            ? updatedProducts[productInDBCartIndex].quantity
            : (updatedProducts[productInDBCartIndex].quantity += 1)
        }

        /* update cart_products and cart_quantity in DB */
        const { error: cart_quantity_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_quantity: updatedCartQuantity })
          .eq("id", userStore.userId)
        if (cart_quantity_error) throw cart_quantity_error
        const { error: users_cart_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_products: updatedProducts })
          .eq("id", userStore.userId)
        if (users_cart_error) throw users_cart_error
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["increaseProductQuantity"] })

      console.log(83, "{ ...product } - ", { ...product })
    },
  })

  return (
    <article className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      {product.img_url.length === 1 ? (
        <Image
          className="w-full tablet:aspect-video h-[300px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover"
          src={product.img_url[0]}
          alt="image"
          width={720}
          height={480}
        />
      ) : (
        <Slider
          containerClassName="tablet:w-fit"
          className="h-[300px]"
          images={product.img_url}
          title={product.title}
        />
      )}
      <section className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-4 pt-2 pb-4">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand">
          <div className="flex flex-row gap-x-2 justify-between items-center w-full">
            <h1 className="text-2xl tablet:text-xl desktop:text-2xl">{product.title}</h1>
            <h1 className="text-2xl tablet:text-lg desktop:text-xl">{formatCurrency(product.price)}</h1>
          </div>
          <div className="flex flex-col">
            <p className="text-lg tablet:text-sm text-subTitle text-center tablet:text-start">{product.sub_title}</p>
            <p
              className={`text-lg tablet:text-sm text-subTitle text-center tablet:text-start
            ${product.on_stock === 0 && "text-warning"}`}>
              {product.on_stock === 0 ? "Out of stock" : `Left on stock:${product.on_stock}`}
            </p>
          </div>
        </section>

        <section className="min-h-[50px] flex flex-col tablet:flex-row gap-y-4 gap-x-4 justify-between">
          <div className={`flex flex-col justify-center ${productQuantity === 0 ? "hidden" : "flex"}`}>
            <h5
              className={`${
                isPendingIncreaseProductQuantity ? "animate-pulse" : ""
              } text-xl tablet:text-base laptop:text-lg text-center tablet:text-start`}>
              Quantity: <span>{productQuantity}</span>
            </h5>
            <h5 className="text-xl tablet:text-base laptop:text-lg text-center tablet:text-start flex flex-row justify-center tablet:justify-start">
              Sub-total:&nbsp;<p>{formatCurrency(productQuantity * product.price)}</p>
            </h5>
          </div>
          {product.on_stock === 0 ? (
            <div className="w-full flex flex-row justify-center tablet:justify-end items-end">
              <RequestReplanishmentButton />
            </div>
          ) : (
            <div
              className={`flex flex-row gap-x-2 justify-center tablet:justify-end items-end 
            ${productQuantity === 0 && "w-full"}`}>
              <Button
                className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
                variant="success-outline"
                onClick={() =>
                  userStore.isAuthenticated ? increaseProductQuantity() : anonymousCart.increaseProductQuantity(product)
                }>
                +
              </Button>
              <DecreaseProductQuantityButton product={product} />
              <ClearProductQuantityButton product={product} />
            </div>
          )}
        </section>
      </section>
    </article>
  )
}
