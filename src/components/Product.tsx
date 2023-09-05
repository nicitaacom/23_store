import { MdOutlineDeleteOutline } from "react-icons/md"

import { formatCurrency } from "../utils/currencyFormatter"
import useUserCartStore, { IProduct } from "../store/user/userCartStore"
import { Button } from "./ui/"
import useUserStore from "../store/user/userStore"
import supabase from "../utils/supabaseClient"

interface Product {
  id: string
  title: string
  sub_title: string
  price: number
  img_url: string
  on_stock: number
  quantity: number
}

export function Product({ ...product }: Product) {
  const userCartStore = useUserCartStore()
  const userStore = useUserStore()

  // async function increaseItemQuantity(id: string) {
  //   try {
  //     if (userStore.userId) {
  //       const { data } = await supabase.from("users_cart").select("cart_quantity").eq("id", userStore.userId)
  //       const cartQuantity = data?.[0]?.cart_quantity ?? 0
  //       await supabase
  //         .from("users_cart")
  //         .update({ cart_quantity: cartQuantity + 1 })
  //         .eq("id", userStore.userId)
  //     }
  //     console.log("id - ", id)
  //     userCartStore.increaseItemQuantity(id)
  //   } catch (error) {
  //     console.error("increaseItemQuantity - ", error)
  //   }
  // }

  async function increaseProductQuantity(product: IProduct) {
    //if user - increase in store and DB
    if (userStore.userId) {
      const { error } = await supabase
        .from("users_cart")
        .update({
          products: { ...product, quantity: product.quantity + 1 },
          cart_quantity: userCartStore.cartQuantity + 1,
        })
        .eq("id", userStore.userId)
      if (error) throw error
    }
    //if !user - increase in store
    userCartStore.increaseProductQuantity({ ...product, quantity: product.quantity + 1 })
  }

  async function decreaseItemQuantity(id: string) {
    if (userCartStore.cartQuantity > 0) {
      userCartStore.setCartQuantityFromDB(userCartStore.cartQuantity - 1)

      //that's wrong because no userId with product id (is its inside items - eq is row that equals column id)
      const itemQuantity = await supabase.from("users_cart").select("products").eq("id", id)
      if (itemQuantity?.data && itemQuantity.data[0].products > 0) {
        try {
          const response = await supabase.from("users_cart").update({ items: product }).eq("id", userStore.userId)
          if (response.error) throw response.error

          const { data } = await supabase.from("users_cart").select("cart_quantity").eq("id", userStore.userId)
          const cartQuantity = data?.[0]?.cart_quantity ?? 0

          await supabase
            .from("users_cart")
            .update({ cart_quantity: cartQuantity - 1 })
            .eq("id", userStore.userId)
        } catch (error) {
          console.error("decreaseItemQuantity - ", error)
        }
      }
    }
  }

  async function setCartQuantity0() {
    if (userCartStore.cartQuantity === 0) return

    if (userStore.userId) {
      try {
        const respose = await supabase.from("users_cart").update({ items: product }).eq("id", userStore.userId)
        if (respose.error) throw respose.error

        await supabase.from("users_cart").update({ cart_quantity: 0 }).eq("id", userStore)
      } catch (error) {
        console.error("setItemQuantity0 - ", error)
      }
    }
  }
  console.log(78, "Product render")

  return (
    <div className="flex flex-col mobile:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      <img
        className="w-full mobile:max-w-[40%] laptop:max-w-[30%] laptop:h-[200px] object-cover
      laptop:mr-2"
        src={product.img_url}
        alt="image"
      />
      <div className="flex flex-col justify-between gap-y-2 w-full px-4 py-2">
        <div className="flex flex-row justify-between items-start text-brand">
          <div className="flex flex-col">
            <h1 className="text-xl">{product.title}</h1>
            <p className="text-sm text-subTitle">{product.sub_title}</p>
            <p className="text-sm text-subTitle">Left on stock:{product.on_stock}</p>
            <p className="text-sm text-subTitle">Quantity:</p>
          </div>
          <h1 className="text-lg py-[2px]">{formatCurrency(product.price)}</h1>
        </div>
        <div className="flex flex-col laptop:flex-row justify-between pr-2">
          <div className="flex flex-col"></div>
          <div className="flex flex-row gap-x-2">
            <Button
              className="min-w-[50px] laptop:w-fit text-2xl"
              variant="danger-outline"
              onClick={() => decreaseItemQuantity(product.id)}>
              -
            </Button>
            <Button
              className="min-w-[50px] laptop:w-fit text-2xl"
              variant="success-outline"
              onClick={() => increaseProductQuantity(product)}>
              +
            </Button>
            <Button
              className="font-secondary font-thin hidden laptop:flex"
              variant="danger-outline"
              onClick={setCartQuantity0}>
              Clear <MdOutlineDeleteOutline />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
