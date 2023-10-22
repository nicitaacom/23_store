"use client"
import { PostgrestSingleResponse } from "@supabase/supabase-js"
import { memo, useCallback } from "react"

import { ICartProduct } from "@/interfaces/ICartProduct"
import { IDBProduct } from "@/interfaces/IDBProduct"
import useCartStore from "@/store/user/cartStore"
import { Product } from "."

//TODO - get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB

interface ProductsProps {
  products: IDBProduct[] | undefined
}

function Products({ products }: ProductsProps) {
  //output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  //set individual quantity for each user in updatedProducts variable

  //component will be rendered twice because I use 2 store (or because I fire method productsStore.setProducts)
  const cartStore = useCartStore()

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
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {products?.map(product => (
          <Product
            {...product}
            quantity={cartStore.products[product.id]?.quantity ?? 0}
            increaseProductQuantity={increaseProductQuantity}
            decreaseProductQuantity={decreaseProductQuantity}
            clearProductQuantity={clearProductQuantity}
            key={product.id}
          />
        ))}
      </ul>
      {/* Pagination bar in future + limit per page */}
    </div>
  )
}

export default memo(Products)
