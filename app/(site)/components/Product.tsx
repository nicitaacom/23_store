"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

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
import { useEffect, useState } from "react"
import useUserStore from "@/store/user/userStore"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import supabaseClient from "@/utils/supabaseClient"
import getCartFromDB from "@/actions/getCart"
import { ICartProductsResponse, ICartQuantityResponse } from "./Products"

export default function Product({ ...product }: ICartProduct) {
  const queryClient = useQueryClient()
  const userStore = useUserStore()
  const anonymousCart = useAnonymousCartStore()

  const [productQuantity, setProductQuantity] = useState(product.quantity)

  useEffect(() => {
    setProductQuantity(product.quantity)
  }, [product.quantity])

  //Increase product quantity
  const {
    mutate: increaseProductQuantity,
    isPending: isPendingIncreaseProductQuantity,
    context: contextIncreaseProductQuantity,
  } = useMutation({
    mutationFn: async () => {
      /* logic to update cart_quantity in DB */
      //update cart quantity first
      const cart_quantity: ICartQuantityResponse | undefined = queryClient.getQueryData(["cart_quantity"])
      console.log(43, "cart_quantity - ", cart_quantity)
      // let updated_cart_quantity = cart_quantity?.data?.cart_quantity
      // if (productQuantity === 0 && updated_cart_quantity !== null && updated_cart_quantity !== undefined) {
      //   updated_cart_quantity += 1
      //   queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      // } else if (productQuantity === product.on_stock) {
      //   //return because I don't want to do code below
      //   return updated_cart_quantity
      // } else if (updated_cart_quantity !== null && updated_cart_quantity !== undefined) {
      //   updated_cart_quantity += 1
      //   queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      // }
      // /* logic to update cart_products in DB */

      // const cart_products: ICartProductsResponse | undefined = queryClient.getQueryData(["cart_products"])
      // const updated_cart_products = cart_products?.data?.cart_products
      // if (productQuantity === 0) {
      //   //Add product in updated_cart_products if product.quantity === 0 to set in in future
      //   updated_cart_products?.push({ ...product, quantity: 1 })
      //   setProductQuantity(productQuantity + 1)
      // } else if (productQuantity === product.on_stock) {
      //   updated_cart_products
      // } else if (updated_cart_products !== undefined) {
      //   updated_cart_products[
      //     updated_cart_products.findIndex(productInCart => productInCart.id === product.id)
      //   ].quantity += 1
      //   setProductQuantity(productQuantity + 1)
      // }

      /* update cart_products and cart_quantity in DB */

      //requert to api because cookies form next/headers allowed only in server components
      //otherwise I allow any user with URL and ANON_KEY modify any cart_quantity with RLS
      const response = await axios.post("api/update/cart_quantity", { cart_quantity: 12, user_id: userStore.userId })
      console.log(79, "response - ", response)

      // const { error: users_cart_error } = await supabaseClient
      //   .from("users_cart")
      //   .update({ cart_products: updated_cart_products })
      //   .eq("id", userStore.userId)
      // if (users_cart_error) throw users_cart_error

      /* if no erros update product.quantity */
    },
    onMutate: async () => {
      /* logic to update cart_quantity optimistically */
      //update cart quantity first
      const cart_quantity: ICartQuantityResponse | undefined = queryClient.getQueryData(["cart_quantity"])
      let updated_cart_quantity = cart_quantity?.data?.cart_quantity
      console.log(93, "updated_cart_quantity - ", updated_cart_quantity)
      if (productQuantity === 0 && updated_cart_quantity !== null && updated_cart_quantity !== undefined) {
        console.log(95, "updated_cart_quantity - ", updated_cart_quantity)
      } else if (productQuantity === product.on_stock) {
        return updated_cart_quantity
      } else if (updated_cart_quantity !== null && updated_cart_quantity !== undefined) {
        updated_cart_quantity += 1
        console.log(99, "updated_cart_quantity - ", updated_cart_quantity)
      }
      /* logic to update cart_products optimistically */
      const cart_products: ICartProductsResponse | undefined = queryClient.getQueryData(["cart_products"])
      const updated_cart_products = cart_products?.data?.cart_products
      if (productQuantity === 0) {
        //Add product in updated_cart_products if product.quantity === 0 to set in in future
        updated_cart_products?.push({ ...product, quantity: 1 })
      } else if (productQuantity === product.on_stock) {
        updated_cart_products
      } else if (updated_cart_products !== undefined) {
        updated_cart_products[
          updated_cart_products.findIndex(productInCart => productInCart.id === product.id)
        ].quantity += 1
        setProductQuantity(productQuantity + 1)
      }
      /* update cart_products and cart_quantity optimistically */
      queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      queryClient.setQueryData(["cart_products"], updated_cart_products)
      console.log(120, queryClient.getQueryData(["cart_quantity"]))
      if (product.quantity === 0) {
        //Add new product in anonymous cart if it doesn't exist
        setProductQuantity((product.quantity += 1))
      } else {
        // If product already exists - update the quantity
        product.on_stock === product.quantity
          ? setProductQuantity(product.quantity)
          : setProductQuantity((product.quantity += 1))
      }
    },
    onError: () => {
      //set previous state
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
