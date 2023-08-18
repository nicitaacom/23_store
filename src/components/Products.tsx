import { useEffect, useState } from "react"

import { MdOutlineDeleteOutline } from 'react-icons/md'

import useGetUserId from "../hooks/useGetUserId"
import supabase from "../utils/supabaseClient"
import { formatCurrency } from "../utils/currencyFormatter"
import { ProductsSkeleton } from "./ui/Skeletons/ProductsSkeleton"
import { Button } from "."
import useUserCartStore from "../store/userCartStore"

interface Product {
  id: string
  label: string
  price: number
  img_url: string | undefined
  on_stock: number
}



function Product({ ...product }: Product) {

  const { userId } = useGetUserId()

  const userCartStore = useUserCartStore()

  useEffect(() => {
    async function getCartQuantity() {
       if (userId) {
        try {
          const { data: cartQuantityResponse } = await supabase
          .from("users_cart")
          .select("cart_quantity")
          .eq("id", userId)
          if (cartQuantityResponse) {
            userCartStore.setCartQuantityFromDB(cartQuantityResponse[0].cart_quantity);
          }
        } catch (error) {
          console.error("fetchCartQuantity - ", error);
        }
      }
    }
    getCartQuantity()
  }, [userId])

  if (userCartStore.cartQuantity === null) {
    return <ProductsSkeleton />
  }


  async function increaseItemQuantity(id: string) {
    try {
      if (userId) {
        const { data } = await supabase.from("users_cart")
          .select("cart_quantity")
          .eq("id", userId)
        const cartQuantity = data?.[0]?.cart_quantity ?? 0
        await supabase.from("users_cart").update({ cart_quantity: cartQuantity + 1 }).eq("id", userId)
      }
      console.log("id - ", id)
      userCartStore.increaseItemQuantity(id)

    } catch (error) {
      console.error("increaseItemQuantity - ", error)
    }
  }

  async function decreaseItemQuantity(id:string) {
    if (userCartStore.cartQuantity > 0) {
      userCartStore.setCartQuantityFromDB(userCartStore.cartQuantity - 1)
      try {
        const response = await supabase.from("users_cart")
          .update({ items: product })
          .eq("id", userId)
        if (response.error) throw response.error

        const { data } = await supabase.from("users_cart")
          .select("cart_quantity")
          .eq("id", userId)
        const cartQuantity = data?.[0]?.cart_quantity ?? 0

        await supabase.from("users_cart")
          .update({ cart_quantity: cartQuantity - 1 })
          .eq("id", userId)

      } catch (error) {
        console.error("decreaseItemQuantity - ", error)
      }
    }
  }

  async function setCartQuantity0() {
    if (userCartStore.cartQuantity === 0) return
    
    if (userId) {
      try {
        const respose = await supabase.from("users_cart")
        .update({ items: product })
        .eq("id", userId)
      if (respose.error) throw respose.error

      await supabase.from("users_cart")
        .update({ cart_quantity: 0 })
        .eq("id", userId)
      } catch (error) {
        console.error("setItemQuantity0 - ", error)
      }
    }
  }

  return (
    <div className="flex flex-col mobile:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      <img className="w-full mobile:max-w-[40%] laptop:max-w-[30%] laptop:h-[200px] object-cover
      laptop:mr-2" src={product.img_url} alt="image" />
      <div className="flex flex-col justify-between gap-y-2 w-full px-4 py-2">
        <div className="flex flex-row justify-between items-start text-brand">
          <div className="flex flex-col">
            <h1 className="text-xl">{product.label}</h1>
            <p className="text-sm text-subTitle">Left on stock:{product.on_stock}</p>
            <p className="text-sm text-subTitle">Quantity:</p>
          </div>
          <h1 className="text-lg py-[2px]">{formatCurrency(product.price)}</h1>
        </div>
        <div className="flex flex-col laptop:flex-row justify-between pr-2">
          <div className="flex flex-col">


          </div>
          <div className="flex flex-col gap-y-2">
            <Button className="font-secondary font-thin hidden laptop:flex" variant='danger-outline'
            onClick={setCartQuantity0}>Clear <MdOutlineDeleteOutline /></Button>
            <div className="flex flex-row gap-x-2">
              <Button className="w-full laptop:w-fit text-2xl" variant='danger-outline'
                onClick={() => decreaseItemQuantity(product.id)}>-</Button>
              <Button className="w-full laptop:w-fit text-2xl" variant='success-outline'
                onClick={() => increaseItemQuantity(product.id)}>+</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export function Products() {


  const [products, setProducts] = useState([{
    id: "",
    label: "",
    price: 0,
    img_url: "",
    on_stock: 0,
    quantity: 0,
  }])



  useEffect(() => {
    async function getProducts() {
      try {
        const response = await supabase.from("products")
          .select("*")
        if (response.error) throw response.error
        console.log("response - ", response.data)
        setProducts(response.data)
      } catch (error) {
        console.error("getProducts - ", error)
      }
    }
    getProducts()
  }, [])



  return (
    <div className="border-[1px] border-solid broder-border-color rounded 
    w-full max-w-[1440px]">
      <div className="flex flex-row justify-between w-full px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {products.map(product => (
          <li key={product.id}>
            <Product {...product} />
          </li>
        ))}
      </ul>
    </div>
  )
}