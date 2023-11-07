"use client"

import { BiTrash } from "react-icons/bi"

import { formatCurrency } from "@/utils/currencyFormatter"
import { Button } from "@/components/ui"
import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"

interface DeleteProductHeaderProps {
  id: string
  title: string
  subTitle: string
  onStock: number
  price: number
}

export function DeleteProductHeader({ id, title, subTitle, onStock, price }: DeleteProductHeaderProps) {
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()

  return (
    <>
      <section className="flex flex-col">
        <div className="flex flex-col tablet:flex-row gap-y-4 items-center tablet:items-start tablet:justify-between">
          <div className="flex flex-row text-subTitle">
            Title:&nbsp;<h2>{title}</h2>
          </div>
          <div className="flex flex-row text-subTitle">
            <p className="tablet:hidden">Price:&nbsp;</p>
            <h2>{formatCurrency(price)}</h2>
          </div>
        </div>
        <div className="flex flex-row justify-center tablet:justify-start text-subTitle mt-4 tablet:mt-0">
          Description:&nbsp;<h2>{subTitle}</h2>
        </div>
        <div className="flex flex-row justify-center tablet:justify-start text-subTitle mt-4 tablet:mt-0">
          On stock:&nbsp;<h2>{onStock}</h2>
        </div>
      </section>
      {/* DELETE PRODUCT FOOTER */}
      <section className="flex justify-end">
        <Button variant="danger" onClick={() => areYouSureDeleteProductModal.openModal(id, title)}>
          Delete <BiTrash />
        </Button>
      </section>
    </>
  )
}
