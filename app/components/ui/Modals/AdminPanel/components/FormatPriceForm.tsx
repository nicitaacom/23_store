"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CiEdit } from "react-icons/ci"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { formatCurrency } from "@/utils/currencyFormatter"
import supabaseClient from "@/utils/supabaseClient"

interface FormatPriceFormProps {
  id: string
  price: number
}

export function FormatPriceForm({ id, price }: FormatPriceFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  async function updateTitle(price: number) {
    setIsLoading(true)
    await supabaseClient.from("products").update({ price: price }).eq("id", id)
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
      const onSubmitForm = handleSubmit(onSubmit)
      onSubmitForm() // Call the onSubmit function directly
    }
  }

  useEffect(() => {
    const ref = inputRef.current
    // https://github.com/react-hook-form/react-hook-form/issues/11135
    // console.log(62, "inputRef.current - ", inputRef.current)
    if (inputRef.current) {
      inputRef.current.addEventListener("keydown", disableInput)
    }
    return () => ref?.removeEventListener("keydown", disableInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

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
