import { useEffect, useState } from "react"

import supabase from "../utils/supabaseClient"

import { ProductsSkeleton } from "./ui/Skeletons/ProductsSkeleton"
import { Product } from "./Product"
import useUserCartStore from "../store/user/userCartStore"
import { IProduct } from "../interfaces/IProduct"

export function Products() {
  const userCartStore = useUserCartStore()

  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<IProduct[]>([
    {
      id: "",
      title: "",
      sub_title: "",
      price: 0,
      img_url: [""],
      on_stock: 0,
      quantity: 0,
    },
  ])

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true)
        const response = await supabase.from("products").select("*")
        if (response.error) throw response.error
        //add quantity for each product because (user A quantity - 2 - user B - quantity 3 )
        const updatedResponse = response.data.map(product => {
          const matchingProduct = userCartStore.products.find(item => item.id === product.id)
          return {
            ...product,
            quantity: matchingProduct ? matchingProduct.quantity : 0,
          }
        })

        setProducts(updatedResponse)
        setIsLoading(false)
      } catch (error) {
        console.error("fetchProducts - ", error)
      }
    }
    fetchProducts()
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {isLoading ? (
          <ProductsSkeleton />
        ) : (
          products.map(product => (
            <li key={product.id}>
              <Product {...product} />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
