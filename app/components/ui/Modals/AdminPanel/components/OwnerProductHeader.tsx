import { TProductTranslations } from "@/ts/product/TProductDB"
import { EditProductCategory } from "./EditProductCategory"
import { EditProductDescription } from "./EditProductDescription"
import { EditProductOnStock } from "./EditProductOnStock"
import { EditProductPrice } from "./EditProductPrice"
import { EditProductTitle } from "./EditProductTitle"

interface OwnerProductHeaderProps {
  id: string
  translations: TProductTranslations
  price: number
  onStock: number
  hasVariants: boolean
  category_id?: string | null
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function OwnerProductHeader({ id, translations, price, onStock, hasVariants, category_id }: OwnerProductHeaderProps) {
  return (
    <section className="flex min-w-0 flex-col gap-y-3">
      <div className="flex min-w-0 flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <EditProductTitle id={id} translations={translations} />
        <EditProductPrice id={id} price={price} />
      </div>
      <EditProductDescription id={id} translations={translations} />
      <EditProductOnStock id={id} onStock={onStock} isDerivedFromVariants={hasVariants} />
      <EditProductCategory id={id} category_id={category_id} />
    </section>
  )
}
