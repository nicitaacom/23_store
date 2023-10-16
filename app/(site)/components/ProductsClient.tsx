"use client"
import { ProductsSkeleton } from "@/components/Skeletons"
import { IProduct } from "@/interfaces/IProduct"
import { Product } from "."
import { ICartProduct } from "@/interfaces/ICartProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import { PostgrestSingleResponse } from "@supabase/supabase-js"

//TODO - get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB

interface ProductsProps {
  products: PostgrestSingleResponse<
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
}

export default function ProductsClient({ products }: ProductsProps) {
  //output products with product.quantity that I take from users_cart
  const anonymousCart = useAnonymousCartStore()
  const cartProducts = anonymousCart.cartProducts
  //set individual quantity for each user in updatedProducts variable
  const updatedProducts = products?.data?.map((product: IProduct) => {
    const productQuantity = cartProducts?.find((cartProduct: ICartProduct) => cartProduct.id === product.id)
    return {
      ...product,
      quantity: productQuantity ? productQuantity.quantity : 0,
    }
  })

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
