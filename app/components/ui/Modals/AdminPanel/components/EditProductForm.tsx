"use client"

import { IDBProduct } from "@/interfaces/IDBProduct"
import { memo, useCallback, useEffect, useState } from "react"
import OwnerProduct from "./OwnerProduct"
import { useForm } from "react-hook-form"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"

interface EditProductForm {
  ownerProducts: IDBProduct[]
}

function EditProductForm({ ownerProducts }: EditProductForm) {
  const [isLoading, setIsLoading] = useState(false)
  const [showTitleInput, setShowTitleInput] = useState<Record<string, boolean>>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const toggleShowTitleInput = useCallback((productId: string) => {
    setShowTitleInput(prevState => ({
      ...prevState,
      [productId]: !prevState[productId],
    }))
  }, [])
  console.log("EditProductForm.tsx re-render")

  return (
    <>
      {ownerProducts.length > 0 ? (
        <div className="w-[90%] mx-auto">
          {ownerProducts.map(ownerProduct => (
            <OwnerProduct
              {...ownerProduct}
              register={register}
              errors={errors}
              toggleShowTitleInput={toggleShowTitleInput}
              showTitleInput={showTitleInput[ownerProduct.id]}
              key={ownerProduct.id}
            />
          ))}
        </div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to edit</h1>
      )}
    </>
  )
}

export default memo(EditProductForm)
