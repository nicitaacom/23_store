"use client"

import supabaseClient from "@/utils/supabaseClient"
import { PostgrestSingleResponse, User } from "@supabase/supabase-js"

import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"
import { IProduct } from "@/interfaces/IProduct"
import { Product } from "."
import { ICartProduct } from "@/interfaces/ICartProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import { memo, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

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

export type ICartQuantityResponse = PostgrestSingleResponse<{ cart_quantity: number | null }>

interface ProductsProps {
  user: User | null
  products: IProduct[] | undefined
}

function Products({ user, products }: ProductsProps) {
  //output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  //set individual quantity for each user in updatedProducts variable

  //fetch cart quantity here to get queryData in future without request to DB when increase/decrease product quantity

  const {} = useQuery({
    queryKey: ["cart_quantity"],
    queryFn: async () => {
      if (user) {
        const cart_quantity = await supabaseClient.from("users_cart").select("cart_quantity").eq("id", user.id).single()
        if (cart_quantity.error) throw cart_quantity.error
        return cart_quantity.data?.cart_quantity
      }
      return null
    },
  })

  //I may try to do request to get products here

  const {
    data: cart_products,
    isLoading: isLoading_cart_products,
    isError: isError_cart_products,
  } = useQuery({
    queryKey: ["cart_products"],
    queryFn: async () => {
      if (user) {
        const cart_products = await supabaseClient.from("users_cart").select("cart_products").single()
        if (cart_products.error) throw cart_products.error
        return cart_products.data?.cart_products
      }
      return null
    },
  })
  const [updatedProducts, setUpdatedProducts] = useState<ICartProduct[] | undefined>(cart_products || [])
  const anonymousCart = useAnonymousCartStore()
  useEffect(() => {
    if (cart_products === undefined || cart_products === null) {
      const updatedProducts = products?.map((product: IProduct) => {
        const productQuantity = anonymousCart.cartProducts.find(
          (cartProduct: ICartProduct) => cartProduct.id === product.id,
        )
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      setUpdatedProducts(updatedProducts)
    } else {
      const updatedProducts = products?.map((product: IProduct) => {
        const productQuantity = cart_products?.find((cartProduct: ICartProduct) => cartProduct.id === product.id)
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      setUpdatedProducts(updatedProducts ?? [])
    }
    //anonymousCart.cartQuantity in deendency required to see changes when I increase product.qauntity when !user
  }, [anonymousCart.cartProducts, cart_products, products, anonymousCart.cartQuantity])

  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {updatedProducts?.map(updatedProduct => (
          <li key={updatedProduct.id}>
            <Product {...updatedProduct} />
          </li>
        ))}
      </ul>
      {/* Pagination bar in future + limit per page */}
    </div>
  )
}

export default memo(Products)
