import { IDBProduct } from "@/interfaces/IDBProduct"
import { OwnerDeleteProduct } from "./OwnerDeleteProduct"

interface DeleteProductForm {
  ownerProducts: IDBProduct[]
}

export function DeleteProductForm({ ownerProducts }: DeleteProductForm) {
  return (
    <div className="w-[90%] mx-auto">
      {ownerProducts.length > 0 ? (
        <div className="flex flex-col gap-y-4">
          {ownerProducts.map(ownerProduct => (
            <OwnerDeleteProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to delete</h1>
      )}
    </div>
  )
}
