"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import axios from "axios"

import { TUpdateProductRequest } from "@/api/products/update/route"
import { IFormDataAddProduct } from "@/interfaces/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { formatCurrency } from "@/utils/currencyFormatter"
import { useLoading } from "@/store/ui/useLoading"

interface FormatPriceFormProps {
  id: string
  price: number
}

export function FormatPriceForm({ id, price }: FormatPriceFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { isLoading, setIsLoading } = useLoading()
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(price: number) {
    setIsLoading(true)
    await axios.post("/api/products/update", { productId: id, price: price } as TUpdateProductRequest)
    setIsEditing(false)
    setIsLoading(false)
    router.refresh()
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const onSubmit = (data: IFormDataAddProduct) => {
    updateTitle(data.price)
  }

  const enableInput = () => {
    setIsEditing(true)
  }

  const disableInput = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      setIsEditing(false)
    }
    if (event.key === "Enter") {
      handleSubmit(onSubmit) // call on submit like this to prevent x3 re-render
    }
  }

  useEffect(() => {
    const ref = inputRef.current
    // https://github.com/react-hook-form/react-hook-form/issues/11135
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <h1 className="flex flex-row">
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div ref={inputRef}>
            <ProductInput
              className={twMerge(`text-center tablet:text-end w-full`, isLoading && "animate-pulse")}
              id="price"
              register={register}
              errors={errors}
              placeholder={price.toString()}
              required
            />
          </div>
        </form>
      ) : (
        <div className="flex flex-row gap-x-2 items-center" role="button" onClick={enableInput}>
          {formatCurrency(price)}
          <CiEdit />
        </div>
      )}
    </h1>
  )
}
