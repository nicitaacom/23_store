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
  return (
    <>
      {ownerProducts.length > 0 ? (
        <div className="w-[90%] flex flex-col gap-y-4 mx-auto">
          {ownerProducts.map(ownerProduct => (
            <OwnerProduct {...ownerProduct} key={ownerProduct.id} />
          ))}
        </div>
      ) : (
        <h1 className="pt-24 text-2xl text-center font-bold w-[90%] mx-auto">You have no products to edit</h1>
      )}
    </>
  )
}

export default memo(EditProductForm)
