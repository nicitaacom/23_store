"use client"

import { TProductDB } from "@/interfaces/product/TProductDB"
import { OwnerDeleteProduct } from "./OwnerDeleteProduct"
import Image from "next/image"
import useDarkMode from "@/store/ui/darkModeStore"

interface DeleteProductForm {
  ownerProducts: TProductDB[]
}

export function DeleteProductForm({ ownerProducts }: DeleteProductForm) {
  const isDarkMode = useDarkMode().isDarkMode

  return (
    <div className="w-[90%] h-full mx-auto">
      {ownerProducts.length > 0 ? (
        <div className="flex flex-col gap-y-4">
          {ownerProducts.map(ownerProduct => (
            <OwnerDeleteProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <div className="h-full flex flex-col gap-y-8 justify-center items-center pb-16 w-[90%] mx-auto">
          <Image
            src={isDarkMode ? "/no-products-to-delete-dark.png" : "/no-products-to-delete-light.png"}
            alt="no-products-to-delete.png"
            width={256}
            height={256}
          />
          <h1 className="text-2xl text-center font-bold">You have no products to delete</h1>
        </div>
      )}
    </div>
  )
}
