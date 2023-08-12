import { Button } from "."
import { formatCurrency } from "../utils/currencyFormatter"
import { useEffect, useState } from "react"
import supabase from "../utils/supabaseClient"
import useProductsStore from "../store/productsStore"
import useGetUserId from "../hooks/useGetUserId"

interface Product {
  id: string
  label: string
  price: number
  img_url: string | undefined
  on_stock: number
}


function Product(product: Product) {

  const productsStore = useProductsStore()

  const [products, setProducts] = useState<Product[]>([product])

  const { userId } = useGetUserId()

  async function increaseItemQuantity() {
    try {
      const response = await supabase.from("user_cart")
        .update({ items: product })
        .eq("id", userId)

      const { data } = await supabase.from("user_cart")
        .select("cart_quantity")
        .eq("id", userId)
      const cartQuantity = data?.[0]?.cart_quantity ?? 0
      await supabase.from("user_cart").update({ cart_quantity: cartQuantity + 1 }).eq("id", userId)
      if (response.error) throw response.error
    } catch (error) {
      console.error("increaseItemQuantity - ", error)
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
            <p className="text-sm text-gray-300">Quantity:</p>
          </div>
          <div className="flex flex-col gap-y-2">
            <Button variant='danger'>Clear</Button>
            <div className="flex flex-row gap-x-2">
              <Button variant='success-outline' className="w-full laptop:w-fit text-2xl"
                onClick={increaseItemQuantity}>+</Button>
              <Button variant='danger-outline' className="w-full laptop:w-fit text-2xl">-</Button>
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
    <div className="border-[1px] border-solid broder-gray-500 rounded">
      <h1 className="border-b-2 border-solid border-gray-500 mb-4">Products:</h1>
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