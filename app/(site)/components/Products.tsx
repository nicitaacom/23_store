import supabaseServer from "@/utils/supabaseServer"

import { ProductsSkeleton } from "@/components/Skeletons"
import { IProduct } from "@/interfaces/IProduct"
import { Product } from "."

//TODO - get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB

async function fetchProductsQuantity() {
  //TODO - create case for unauthenticated user I mean if !user output something
  const { data: user } = await supabaseServer().auth.getUser()
  if (user?.user?.id) {
    const cartProductQuantity = await supabaseServer()
      .from("users_cart")
      .select("cart_products")
      .eq("id", user.user.id)
      .single()
    return cartProductQuantity.data?.cart_products as unknown as IProduct[]
  }
}

export default async function Products() {
  const products = await supabaseServer().from("products").select("*").limit(10)
  //output products with product.quantity that I take from users_cart
  const cartProductsQuantity = await fetchProductsQuantity()
  //set individual quantity for each user in updatedProducts variable
  const updatedProducts = products.data?.map((product: Omit<IProduct, "quantity">) => {
    const productQuantity = cartProductsQuantity?.find((cartProduct: IProduct) => cartProduct.id === product.id)
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
