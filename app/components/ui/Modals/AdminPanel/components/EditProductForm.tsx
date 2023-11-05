"use client"

import { useRouter } from "next/navigation"

import { IDBProduct } from "@/interfaces/IDBProduct"
import { OwnerProduct } from "./OwnerProduct"

interface EditProductForm {
  ownerProducts: IDBProduct[]
}

export function EditProductForm({ ownerProducts }: EditProductForm) {
  return (
    <div className="w-[90%] mx-auto">
      {ownerProducts.length > 0 ? (
        <div className="flex flex-col gap-y-4">
          {ownerProducts.map(ownerProduct => (
            <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to edit</h1>
      )}
    </div>
  )
}
