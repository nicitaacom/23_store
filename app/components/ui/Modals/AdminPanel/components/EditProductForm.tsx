import Image from "next/image"

import { TProductDB } from "@/interfaces/product/TProductDB"
import { OwnerProduct } from "./OwnerProduct"
import { getCookie } from "@/utils/helpersSSR"
import { isDarkMode } from "@/functions/isDarkMode"

interface EditProductForm {
  ownerProducts: TProductDB[]
}

export function EditProductForm({ ownerProducts }: EditProductForm) {
  return (
    <div className="w-[90%] h-full mx-auto">
      {ownerProducts.length > 0 ? (
        <div className="h-full flex flex-col gap-y-4">
          {ownerProducts.map(ownerProduct => (
            <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <div className="h-full flex flex-col gap-y-8 justify-center items-center pb-16 w-[90%] mx-auto">
          <Image
            src={isDarkMode() ? "/no-products-to-edit-dark.png" : "/no-products-to-edit-light.png"}
            alt="no-products-to-edit.png"
            width={256}
            height={256}
          />
          <h1 className="text-2xl text-center font-bold">You have no products to edit</h1>
        </div>
      )}
    </div>
  )
}
