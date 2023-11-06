"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { CiEdit } from "react-icons/ci"
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai"

import { RadioButton } from "@/components/ui"
import useUserStore from "@/store/user/userStore"
import { IDBProduct } from "@/interfaces/IDBProduct"

import { ModalContainer } from "../../ModalContainer"
import { EditProductForm } from "./components/EditProductForm"
import { AddProductForm } from "./components/AddProductForm"
import { DeleteProductForm } from "./components/DeleteProductForm"

interface AdminPanelModalProps {
  label: string
  ownerProducts: IDBProduct[]
}

export function AdminPanelModal({ label, ownerProducts }: AdminPanelModalProps) {
  const router = useRouter()

  const [productAction, setProductAction] = useState("Add product")
  const [isLoading, setIsLoading] = useState(false)

  const { isAuthenticated } = useUserStore()
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalContainer
      className={twMerge(
        `w-[100vw] max-w-[768px] max-h-full
      flex flex-col bg-primary rounded-md border-[1px] border-solid border-border-color pt-8 transition-all duration-500`,
        productAction === "Add product" && "h-[680px] tablet:max-w-[650px]",
        productAction === "Edit product" && "h-[800px] tablet:max-w-full laptop:max-w-[1024px] desktop:max-w-[1440px]",
        productAction === "Delete product" &&
          "h-[800px] tablet:max-w-full laptop:max-w-[1024px] desktop:max-w-[1440px]",
      )}
      modalQuery="AdminPanel"
      preventClose={isLoading}>
      <h1 className="min-h-[40px] text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
      <ul className="min-h-[144px] tablet:min-h-[50px] flex flex-col tablet:flex-row justify-center mb-8">
        <li>
          <RadioButton
            label="Add product"
            inputName="product"
            onChange={e => {
              setProductAction(e.target.value)
              router.refresh()
            }}
            disabled={isLoading}
            defaultChecked>
            <div className="flex flex-row gap-x-2 items-center">
              Add product <AiOutlinePlus className="text-success" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton
            label="Edit product"
            inputName="product"
            onChange={e => {
              setProductAction(e.target.value)
              router.refresh()
            }}
            disabled={isLoading}>
            <div className="flex flex-row gap-x-2 items-center">
              Edit product <CiEdit className="text-warning" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton
            label="Delete product"
            inputName="product"
            onChange={e => {
              setProductAction(e.target.value)
              router.refresh()
            }}
            disabled={isLoading}>
            <div className="flex flex-row gap-x-2 items-center">
              Delete product <AiOutlineDelete className="text-danger" />
            </div>
          </RadioButton>
        </li>
      </ul>
      <div className={twMerge(`relative w-full h-full pb-8 flex flex-col items-center overflow-y-auto`)}>
        {/* ADD PRODUCT */}

        {productAction === "Add product" && <AddProductForm isLoading={isLoading} setIsLoading={setIsLoading} />}

        {/* EDIT PRODUCT */}

        {productAction === "Edit product" && <EditProductForm ownerProducts={ownerProducts} />}

        {/* DELETE PRODUCT */}

        {productAction === "Delete product" && <DeleteProductForm ownerProducts={ownerProducts} />}
      </div>
    </ModalContainer>
  )
}
