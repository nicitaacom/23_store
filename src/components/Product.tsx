import { MdOutlineDeleteOutline } from "react-icons/md"

import { formatCurrency } from "../utils/currencyFormatter"
import useUserCartStore, { IProduct } from "../store/user/userCartStore"
import { Button } from "./ui/"
import useUserStore from "../store/user/userStore"
import supabase from "../utils/supabaseClient"

export function Product({ ...product }: IProduct) {
  const userCartStore = useUserCartStore()
  const userStore = useUserStore()

  const matchingProduct = userCartStore.products.find(item => item.id === product.id)
  const productQuantity = matchingProduct ? matchingProduct.quantity : 0

  async function setCartQuantity0() {
    if (userCartStore.cartQuantity === 0) return

    if (userStore.userId) {
      try {
        const respose = await supabase.from("users_cart").update({ cart_products: product }).eq("id", userStore.userId)
        if (respose.error) throw respose.error

        await supabase.from("users_cart").update({ cart_quantity: 0 }).eq("id", userStore)
      } catch (error) {
        console.error("setItemQuantity0 - ", error)
      }
    }
  }

  return (
    <article className="flex flex-col mobile:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
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
          </div>
          <h1 className="text-lg py-[2px]">{formatCurrency(product.price)}</h1>
        </div>
        <div className="flex flex-col laptop:flex-row justify-between pr-2">
          <div className="flex flex-col">
            <h5 className={`text-lg ${productQuantity === 0 ? "invisible" : "visible"}`}>
              Quantity: <span>{productQuantity}</span>
            </h5>
            <h5 className="text-lg flex flex-row justify-center tablet:justify-start">
              Sub-total:&nbsp;<p>{formatCurrency(productQuantity * product.price)}</p>
            </h5>
          </div>
          <div className="flex flex-row gap-x-2 justify-end">
            <Button
              className="min-w-[50px] laptop:w-fit text-2xl"
              variant="danger-outline"
              onClick={() => userCartStore.decreaseProductQuantity(product)}>
              -
            </Button>
            <Button
              className="min-w-[50px] laptop:w-fit text-2xl"
              variant="success-outline"
              onClick={() => userCartStore.increaseProductQuantity(product)}>
              +
            </Button>
            <Button
              className="font-secondary font-thin hidden laptop:flex"
              variant="danger-outline"
              onClick={() => userCartStore.setProductQuantity0(product)}>
              Clear <MdOutlineDeleteOutline />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
