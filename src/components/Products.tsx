import { Button } from "."
import { formatCurrency } from "../utils/currencyFormatter"
import { useEffect, useState } from "react"
import supabase from "../utils/supabaseClient"
import useGetUserId from "../hooks/useGetUserId"
import { ProductsSkeleton } from "./ui/Skeletons/ProductsSkeleton"

interface Product {
  id: string
  label: string
  price: number
  img_url: string | undefined
  on_stock: number
}

interface CartQuantityProps {
  cartQuantity: number
  setCartQuantity: React.Dispatch<React.SetStateAction<number>>
}

function Product({ cartQuantity, setCartQuantity, ...product }: CartQuantityProps & Product) {

  const { userId } = useGetUserId()



  useEffect(() => {
    async function fetchCartQuantity() {
      try {
        const { data: cartQuantityResponse } = await supabase
          .from("users_cart")
          .select("cart_quantity")
          .eq("id", userId);
        if (cartQuantityResponse) {
          setCartQuantity(cartQuantityResponse[0].cart_quantity);
        }
      } catch (error) {
        console.error("fetchCartQuantity - ", error);
      }
    }
    fetchCartQuantity()
  }, [userId])

  if (cartQuantity === null) {
    return <ProductsSkeleton />
  }


  async function increaseItemQuantity() {
    setCartQuantity(cartQuantity + 1)
    try {
      const response = await supabase.from("users_cart")
        .update({ items: product })
        .eq("id", userId)

      const { data } = await supabase.from("users_cart")
        .select("cart_quantity")
        .eq("id", userId)
      const cartQuantity = data?.[0]?.cart_quantity ?? 0
      await supabase.from("users_cart").update({ cart_quantity: cartQuantity + 1 }).eq("id", userId)
      if (response.error) throw response.error
    } catch (error) {
      console.error("increaseItemQuantity - ", error)
    }
  }

  async function decreaseItemQuantity() {
    if (cartQuantity && cartQuantity > 0) {
      setCartQuantity(cartQuantity - 1)
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
    if (cartQuantity === 0) return
    setCartQuantity(0)
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

  return (
    <div className="flex flex-col laptop:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      <img className="w-full laptop:max-w-[30%] laptop:h-[200px] h-[clamp(12.5rem,3.5714rem+44.6429vw,25rem)] object-cover
      laptop:mr-2" src={product.img_url} alt="image" />
      <div className="flex flex-col justify-between gap-y-2 w-full">
        <div className="flex flex-col laptop:flex-row justify-between pr-2">
          <div className="flex flex-col">
            <h1>{product.label}</h1>
            <p className="text-sm text-gray-300">Price:{formatCurrency(product.price)}</p>
            <p className="text-sm text-gray-300">Left on stock:{product.on_stock}</p>
            <p className="text-sm text-gray-300">Quantity:{cartQuantity}</p>
          </div>
          <div className="flex flex-col gap-y-2">
            <Button variant='danger'>Clear</Button>
            <div className="flex flex-row gap-x-2">
              <Button className="w-full laptop:w-fit text-2xl" variant='success-outline'
                onClick={increaseItemQuantity}>+</Button>
              <Button className="w-full laptop:w-fit text-2xl" variant='danger-outline'
                onClick={decreaseItemQuantity}>-</Button>
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

  const [cartQuantity, setCartQuantity] = useState<number>(0);


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
    <div className="border-[1px] border-solid broder-gray-500 rounded">
      <div className="flex flex-row justify-between border-b-2 border-solid border-gray-500 mb-4 w-full px-4">
        <h1 className="">Products:</h1>
        <h1>Cart quantity:{cartQuantity}</h1>
      </div>
      <ul className="flex flex-col gap-y-8">
        {products.map(product => (
          <li key={product.id}>
            <Product cartQuantity={cartQuantity} setCartQuantity={setCartQuantity} {...product} />
          </li>
        ))}
      </ul>
    </div>
  )
}