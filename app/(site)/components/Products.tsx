"use client"
import { PostgrestSingleResponse, User } from "@supabase/supabase-js"

import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"
import { IProduct } from "@/interfaces/IProduct"
import { Product } from "."
import { ICartProduct } from "@/interfaces/ICartProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import { memo, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useProductsStore } from "@/store/ui/productsStore"
import { useQueryCartProducts, useQueryCartQuantity } from "@/hooks/reactQuery"

//TODO - get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB

export type IProductsResponse = PostgrestSingleResponse<
  {
    id: string
    img_url: string[]
    on_stock: number
    owner_username: string
    price: number
    sub_title: string
    title: string
  }[]
>
export type ICartProductsResponse = PostgrestSingleResponse<{ cart_products: ICartProduct[] }> | null

export type ICartQuantityResponse = PostgrestSingleResponse<{ cart_quantity: number | null }>

interface ProductsProps {
  products: IProduct[] | undefined
  cart_quantity: number | undefined
  cart_products: ICartProduct[] | undefined
}

function Products({ products, cart_quantity, cart_products }: ProductsProps) {
  //output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  //set individual quantity for each user in updatedProducts variable

  //component will be rendered twice because I use 2 store (or because I fire method productsStore.setProducts)
  const anonymousCart = useAnonymousCartStore()
  const productsStore = useProductsStore()

  useEffect(() => {
    console.log("useEffect")
    if (cart_products === undefined) {
      console.log("!user")
      const updatedProducts = products?.map((product: IProduct) => {
        const productQuantity = anonymousCart.cartProducts.find(
          (cartProduct: ICartProduct) => cartProduct.id === product.id,
        )
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      //I use ! because updatedProducts !== undefined
      productsStore.setProducts(updatedProducts!)
    } else {
      console.log("user")
      const updatedProducts = products?.map((product: IProduct) => {
        const productQuantity = cart_products?.find((cartProduct: ICartProduct) => cartProduct.id === product.id)
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      productsStore.setProducts(updatedProducts!)
    }
    //to prevent too many re-renders error (if you add productsStore in deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart_products, products, anonymousCart.cartQuantity, anonymousCart.cartProducts])

  console.log(99, "productsStore.products - ", productsStore.products)

  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {productsStore.products?.map(updatedProduct => (
          <li key={updatedProduct.id}>
            <Product {...updatedProduct} />
          </li>
        ))}
      </ul>
      {/* Pagination bar in future + limit per page + pagination/lazy loading switcher */}
    </div>
  )
}

export default memo(Products)
