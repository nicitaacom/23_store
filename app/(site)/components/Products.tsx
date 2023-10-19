"use client"

import supabaseClient from "@/utils/supabaseClient"
import { PostgrestSingleResponse, User } from "@supabase/supabase-js"

import { ProductsSkeleton } from "@/components/Skeletons/InitialPageLoading/ProductsSkeleton"
import { IProduct } from "@/interfaces/IProduct"
import { Product } from "."
import { ICartProduct } from "@/interfaces/ICartProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

//TODO - get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB

type IProductsResponse = PostgrestSingleResponse<
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
type ICartResponse = PostgrestSingleResponse<{ cart_products: ICartProduct[] }> | null

export default function Products({ user }: { user: User } | { user: null }) {
  //output products with product.quantity that I take from users_cart
  //set individual quantity for each user in updatedProducts variable
  const {
    data: products,
    isLoading: isLoading_products,
    isError: isError_products,
    // eslint-disable-next-line react-hooks/rules-of-hooks
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const products = await supabaseClient.from("products").select("*").limit(10)
      console.log(18, "products - ", products)
      return products as IProductsResponse | undefined
    },
  })

  const {
    data: cart_products,
    isLoading: isLoading_cart_products,
    isError: isError_cart_products,
    // eslint-disable-next-line react-hooks/rules-of-hooks
  } = useQuery({
    queryKey: ["cart_products"],
    queryFn: async () => {
      if (user) {
        const cart_products = await supabaseClient
          .from("users_cart")
          .select("cart_products")
          .eq("id", user.id ?? "")
          .single()
        return cart_products as ICartResponse
      }
      return null
    },
  })
  const [updatedProducts, setUpdatedProducts] = useState<ICartProduct[] | undefined>(cart_products?.data?.cart_products)
  const anonymousCart = useAnonymousCartStore()
  useEffect(() => {
    if (cart_products?.data?.cart_products === undefined) {
      const updatedProducts = products?.data?.map((product: IProduct) => {
        const productQuantity = anonymousCart.cartProducts.find(
          (cartProduct: ICartProduct) => cartProduct.id === product.id,
        )
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      setUpdatedProducts(updatedProducts ?? [])
    } else {
      const updatedProducts = products?.data?.map((product: IProduct) => {
        const productQuantity = cart_products?.data?.cart_products.find(
          (cartProduct: ICartProduct) => cartProduct.id === product.id,
        )
        return {
          ...product,
          quantity: productQuantity ? productQuantity.quantity : 0,
        }
      })
      setUpdatedProducts(updatedProducts ?? [])
    }
  }, [cart_products, products?.data, anonymousCart.cartQuantity, anonymousCart.cartProducts])

  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {isLoading_products ? (
          <ProductsSkeleton />
        ) : (
          updatedProducts?.map(updatedProduct => (
            <li key={updatedProduct.id}>
              <Product {...updatedProduct} />
            </li>
          ))
        )}
      </ul>
      {/* Pagination bar in future + limit per page + pagination/lazy loading switcher */}
    </div>
  )
}
