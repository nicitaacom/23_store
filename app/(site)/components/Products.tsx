import { memo } from "react"
import { TProductDB } from "@/interfaces/product/TProductDB"
import { Product } from "."
interface ProductsProps {
  products: TProductDB[] | undefined
}

function Products({ products }: ProductsProps) {
  //output products with product.quantity that I take from user ? cart_products : anonymousCart.cartProducts
  //set individual quantity for each user in updatedProducts variable
  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8">{products?.map(product => <Product {...product} key={product.id} />)}</ul>
    </div>
  )
}
export default memo(Products)
