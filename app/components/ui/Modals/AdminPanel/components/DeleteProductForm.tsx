import { IDBProduct } from "@/interfaces/IDBProduct"
import { OwnerDeleteProduct } from "./OwnerDeleteProduct"
import Image from "next/image"

interface DeleteProductForm {
  ownerProducts: IDBProduct[]
}

export function DeleteProductForm({ ownerProducts }: DeleteProductForm) {
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
          <Image src="/no-products-to-delete.png" alt="no-products-to-delete.png" width={256} height={256} />
          <h1 className="text-2xl text-center font-bold">You have no products to delete</h1>
        </div>
      )}
    </div>
  )
}
