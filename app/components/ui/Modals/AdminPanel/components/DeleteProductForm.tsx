import { IDBProduct } from "@/interfaces/IDBProduct"

interface DeleteProductForm {
  ownerProducts: IDBProduct[]
}

export function DeleteProductForm({ ownerProducts }: DeleteProductForm) {
  return (
    <form>
      {ownerProducts.length > 0 ? (
        <div>content</div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to delete</h1>
      )}
    </form>
  )
}
