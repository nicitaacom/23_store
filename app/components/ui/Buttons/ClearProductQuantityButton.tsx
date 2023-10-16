import { MdOutlineDeleteOutline } from "react-icons/md"

import { Button } from ".."
import { IProduct } from "@/interfaces/IProduct"

async function clearProductQuantityInDB() {}

export default function ClearProductQuantityButton({ product }: { product: IProduct }) {
  return (
    <form action={clearProductQuantityInDB}>
      <Button className="font-secondary font-thin max-h-[50px]" variant="danger-outline">
        Clear <MdOutlineDeleteOutline />
      </Button>
    </form>
  )
}
